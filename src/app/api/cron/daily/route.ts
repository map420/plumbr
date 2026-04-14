import { NextRequest, NextResponse } from 'next/server'
import { dbAdapter } from '@/lib/adapters/db'
import { emailAdapter } from '@/lib/adapters/email'
import { estimateFollowUpEmail, invoiceReminderEmail, invoiceOverdueEmail, jobUnbilledEmail } from '@/lib/email-templates'

// Vercel Cron — runs daily at 8am UTC
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/daily", "schedule": "0 8 * * *" }] }

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or internally)
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { overdueMarked: 0, overdueEmailsSent: 0, estimatesExpired: 0, followUpsSent: 0, remindersSent: 0, unbilledAlerts: 0, errors: 0 }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
  const now = new Date()

  try {
    // We need to process all users — in a real multi-tenant app you'd paginate
    // For now we query all records directly via drizzle (bypassing user scoping)
    const { db } = await import('@/db')
    const { invoices } = await import('@/db/schema/invoices')
    const { estimates } = await import('@/db/schema/estimates')
    const { users } = await import('@/db/schema/users')
    const { eq, and, lte, gte } = await import('drizzle-orm')

    // ── Automation #6: Mark overdue invoices + email client ─────────────────
    const sentInvoices = await db.select().from(invoices)
      .where(and(eq(invoices.status, 'sent'), lte(invoices.dueDate, now)))

    for (const inv of sentInvoices) {
      try {
        await db.update(invoices).set({ status: 'overdue', updatedAt: now }).where(eq(invoices.id, inv.id))
        results.overdueMarked++

        // Email client when invoice goes overdue
        if (inv.clientEmail && inv.dueDate) {
          const contractor = await db.select().from(users).where(eq(users.id, inv.userId)).then(r => r[0])
          const contractorName = [contractor?.name, contractor?.companyName].filter(Boolean).join(' · ') || 'Your Contractor'
          const token = inv.shareToken ?? crypto.randomUUID()
          if (!inv.shareToken) {
            await db.update(invoices).set({ shareToken: token }).where(eq(invoices.id, inv.id)).catch(() => null)
          }
          const portalUrl = `${appUrl}/en/portal/${token}`
          await emailAdapter.send({
            to: inv.clientEmail,
            replyTo: contractor?.email,
            subject: `Invoice ${inv.number} is overdue — $${parseFloat(inv.total).toLocaleString()}`,
            html: invoiceOverdueEmail({
              clientName: inv.clientName,
              invoiceNumber: inv.number,
              total: inv.total,
              dueDate: inv.dueDate.toISOString(),
              contractorName,
              portalUrl,
            }),
          }).catch(() => null)
          results.overdueEmailsSent++
        }
      } catch {
        results.errors++
      }
    }

    // ── Automation #7: Expire stale estimates past validUntil ────────────────
    const expiredEstimates = await db.select().from(estimates)
      .where(and(
        eq(estimates.status, 'sent'),
        lte(estimates.validUntil, now),
      ))

    for (const est of expiredEstimates) {
      try {
        await db.update(estimates).set({ status: 'rejected', updatedAt: now }).where(eq(estimates.id, est.id))
        // Notify contractor
        const { notifications } = await import('@/db/schema/notifications')
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: est.userId,
          type: 'estimate_approved', // reuse closest type
          title: `Estimate ${est.number} expired`,
          body: `${est.clientName}'s estimate expired without a response.`,
          href: `/en/estimates/${est.id}`,
          read: false,
          createdAt: now,
        }).catch(() => null)
        results.estimatesExpired++
      } catch {
        results.errors++
      }
    }

    // ── Automation #5: Invoice reminder 3 days before due date ───────────────
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDayStart = new Date(threeDaysFromNow)
    threeDayStart.setHours(0, 0, 0, 0)
    const threeDayEnd = new Date(threeDaysFromNow)
    threeDayEnd.setHours(23, 59, 59, 999)

    const upcomingInvoices = await db.select().from(invoices)
      .where(and(
        eq(invoices.status, 'sent'),
        gte(invoices.dueDate, threeDayStart),
        lte(invoices.dueDate, threeDayEnd),
      ))

    for (const inv of upcomingInvoices) {
      if (!inv.clientEmail || !inv.dueDate) continue
      try {
        const contractor = await db.select().from(users).where(eq(users.id, inv.userId)).then(r => r[0])
        const contractorName = [contractor?.name, contractor?.companyName].filter(Boolean).join(' · ') || 'Your Contractor'
        await emailAdapter.send({
          to: inv.clientEmail,
          replyTo: contractor?.email,
          subject: `Payment reminder — Invoice ${inv.number} due in 3 days`,
          html: invoiceReminderEmail({
            clientName: inv.clientName,
            invoiceNumber: inv.number,
            total: inv.total,
            dueDate: inv.dueDate.toISOString(),
            contractorName,
          }),
        })
        results.remindersSent++
      } catch {
        results.errors++
      }
    }

    // ── Automation #3: Estimate follow-up after 3 days without response ──────
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStart = new Date(threeDaysAgo)
    threeDaysAgoStart.setHours(0, 0, 0, 0)
    const threeDaysAgoEnd = new Date(threeDaysAgo)
    threeDaysAgoEnd.setHours(23, 59, 59, 999)

    const staleEstimates = await db.select().from(estimates)
      .where(and(
        eq(estimates.status, 'sent'),
        gte(estimates.updatedAt, threeDaysAgoStart),
        lte(estimates.updatedAt, threeDaysAgoEnd),
      ))

    for (const est of staleEstimates) {
      if (!est.clientEmail) continue
      try {
        const contractor = await db.select().from(users).where(eq(users.id, est.userId)).then(r => r[0])
        const contractorName = [contractor?.name, contractor?.companyName].filter(Boolean).join(' · ') || 'Your Contractor'
        await emailAdapter.send({
          to: est.clientEmail,
          replyTo: contractor?.email,
          subject: `Following up on your estimate ${est.number}`,
          html: estimateFollowUpEmail({
            clientName: est.clientName,
            estimateNumber: est.number,
            total: est.total,
            contractorName,
            daysSinceSent: 3,
          }),
        })
        results.followUpsSent++
      } catch {
        results.errors++
      }
    }

    // ── Unbilled completed jobs (3+ days without a paid invoice) ────────────
    const { jobs } = await import('@/db/schema/jobs')
    const threeDaysAgoDate = new Date(now)
    threeDaysAgoDate.setDate(threeDaysAgoDate.getDate() - 3)

    const completedJobs = await db.select().from(jobs)
      .where(and(eq(jobs.status, 'completed'), lte(jobs.updatedAt, threeDaysAgoDate)))

    for (const job of completedJobs) {
      try {
        // Check if job has any paid invoice
        const jobInvoices = await db.select().from(invoices)
          .where(and(eq(invoices.jobId, job.id), eq(invoices.status, 'paid')))
        if (jobInvoices.length > 0) continue

        const contractor = await db.select().from(users).where(eq(users.id, job.userId)).then(r => r[0])
        if (!contractor?.email) continue

        const contractorName = [contractor.name, contractor.companyName].filter(Boolean).join(' · ') || 'there'
        const daysSinceCompleted = Math.floor((now.getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24))

        // Only alert once (on day 3, not every day after)
        if (daysSinceCompleted !== 3) continue

        await emailAdapter.send({
          to: contractor.email,
          subject: `⚠️ Job "${job.name}" completed ${daysSinceCompleted} days ago — no invoice sent`,
          html: jobUnbilledEmail({
            contractorName,
            jobName: job.name,
            clientName: job.clientName,
            daysSinceCompleted,
            appUrl: `${appUrl}/en/jobs/${job.id}`,
          }),
        }).catch(() => null)
        results.unbilledAlerts++
      } catch {
        results.errors++
      }
    }

  } catch (err) {
    console.error('[CRON] daily job error:', err)
    return NextResponse.json({ error: 'Cron failed', results }, { status: 500 })
  }

  console.log('[CRON] daily results:', results)
  return NextResponse.json({ ok: true, results })
}
