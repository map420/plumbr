'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { emailAdapter } from '@/lib/adapters/email'
import { revalidatePath } from 'next/cache'
import type { LineItemInput } from '@/lib/adapters/db/types'
import { estimateSentEmail, estimateApprovedEmail } from '@/lib/email-templates'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { requireUser as requireAuth } from './auth-helpers'

export async function getEstimates() {
  const userId = await requireAuth()
  return dbAdapter.estimates.findAll(userId)
}

export async function getEstimate(id: string) {
  const userId = await requireAuth()
  return dbAdapter.estimates.findById(id, userId)
}

export async function getEstimatesByJob(jobId: string) {
  const userId = await requireAuth()
  return dbAdapter.estimates.findByJob(jobId, userId)
}

export async function getLineItems(estimateId: string) {
  return dbAdapter.lineItems.findByParent(estimateId, 'estimate')
}

type RawLineItem = { type: string; description: string; quantity: number; unitPrice: number; total: number }

export async function createEstimate(data: {
  jobId: string; clientId?: string; clientName: string; clientEmail: string; clientPhone?: string; status: string
  subtotal: number; tax: number; total: number; notes: string; validUntil: string
}, items: RawLineItem[]) {
  const userId = await requireAuth()

  // Validation
  if (!data.clientName?.trim() || data.clientName.trim().length < 2) throw new Error('Client name must be at least 2 characters.')
  if (items.length === 0) throw new Error('Add at least one line item to the estimate.')

  // Plan enforcement
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    const existing = await dbAdapter.estimates.findAll(userId)
    if (existing.length >= STARTER_LIMITS.estimates) {
      throw new Error(`PLAN_LIMIT: Upgrade to Pro to create more than ${STARTER_LIMITS.estimates} estimates.`)
    }
  }
  const lineItems: LineItemInput[] = items.map((item, i) => ({
    parentId: '',
    parentType: 'estimate' as const,
    type: item.type as LineItemInput['type'],
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    total: String(item.total),
    sortOrder: i,
  }))

  const estimate = await dbAdapter.estimates.create(userId, {
    jobId: data.jobId || null,
    clientId: data.clientId || null,
    number: '',
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    status: data.status as 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    notes: data.notes || null,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    convertedToInvoiceId: null,
    shareToken: null,
  }, lineItems)

  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function updateEstimate(id: string, data: Partial<{
  status: string; notes: string; convertedToInvoiceId: string
}>) {
  const userId = await requireAuth()
  const previous = await dbAdapter.estimates.findById(id, userId)

  const estimate = await dbAdapter.estimates.update(id, userId, {
    ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' },
    ...data.notes !== undefined && { notes: data.notes },
    ...data.convertedToInvoiceId !== undefined && { convertedToInvoiceId: data.convertedToInvoiceId || null },
  })

  // Automation #1 — Estimate marked Sent → email to client with portal link
  if (data.status === 'sent' && previous?.status !== 'sent' && estimate.clientEmail) {
    const contractorUser = await dbAdapter.users.findById(userId)
    const contractorName = contractorUser?.name ?? contractorUser?.companyName ?? 'Your Contractor'
    // Generate share token so client can approve/reject online
    const token = estimate.shareToken ?? crypto.randomUUID()
    if (!estimate.shareToken) {
      await dbAdapter.estimates.update(estimate.id, userId, { shareToken: token }).catch(() => null)
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://plumbr.mrlabs.io'
    const portalUrl = `${appUrl}/en/portal/${token}`
    await emailAdapter.send({
      to: estimate.clientEmail,
      replyTo: contractorUser?.email,
      subject: `Estimate ${estimate.number} from ${contractorName} — $${parseFloat(estimate.total).toLocaleString()}`,
      html: estimateSentEmail({
        clientName: estimate.clientName,
        estimateNumber: estimate.number,
        total: estimate.total,
        validUntil: estimate.validUntil ? estimate.validUntil.toISOString() : null,
        notes: estimate.notes,
        contractorName,
        portalUrl,
      }),
    }).catch(err => console.error('[AUTO #1] email failed:', err))
  }

  // Automation #2 — Estimate marked Approved → linked Job becomes Active
  if (data.status === 'approved' && previous?.status !== 'approved' && estimate.jobId) {
    await dbAdapter.jobs.update(estimate.jobId, userId, { status: 'active' })
      .catch(err => console.error('[AUTO #2] job update failed:', err))
  }

  // Email contractor when estimate approved
  if (data.status === 'approved' && previous?.status !== 'approved') {
    const contractorUser = await dbAdapter.users.findById(userId)
    if (contractorUser?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://plumbr.mrlabs.io'
      await emailAdapter.send({
        to: contractorUser.email,
        subject: `✅ ${estimate.clientName} approved estimate ${estimate.number}`,
        html: estimateApprovedEmail({
          contractorName: contractorUser.name ?? contractorUser.companyName ?? 'there',
          clientName: estimate.clientName,
          estimateNumber: estimate.number,
          total: estimate.total,
          appUrl: `${appUrl}/en/estimates/${estimate.id}`,
        }),
      }).catch(err => console.error('[NOTIF] estimate_approved email failed:', err))
    }
  }

  // Notification — Estimate marked Approved
  if (data.status === 'approved' && previous?.status !== 'approved') {
    await dbAdapter.notifications.create(userId, {
      type: 'estimate_approved',
      title: `Estimate ${estimate.number} approved`,
      body: `${estimate.clientName} approved $${parseFloat(estimate.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      href: `/en/estimates/${estimate.id}`,
      read: false,
    }).catch(err => console.error('[NOTIF] estimate_approved failed:', err))
  }

  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function deleteEstimate(id: string) {
  const userId = await requireAuth()
  await dbAdapter.estimates.delete(id, userId)
  revalidatePath('/[locale]/estimates', 'page')
}
