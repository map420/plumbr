'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import type { LineItemInput } from '@/lib/adapters/db/types'
import { isPro } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { requireUser as requireAuth } from './auth-helpers'
import { emailAdapter } from '@/lib/adapters/email'

async function requirePro() {
  const userId = await requireAuth()
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    throw new Error('PLAN_LIMIT: Upgrade to Pro to use Change Orders.')
  }
  return userId
}

export async function getChangeOrders() {
  const userId = await requirePro()
  return dbAdapter.changeOrders.findAll(userId)
}

export async function getChangeOrdersByJob(jobId: string) {
  const userId = await requirePro()
  return dbAdapter.changeOrders.findByJob(jobId, userId)
}

type RawLineItem = { type: string; description: string; quantity: number; unitPrice: number; total: number }

export async function createChangeOrder(data: {
  jobId: string; estimateId?: string; description?: string; status?: string
  subtotal: number; tax: number; total: number; notes?: string
}, items: RawLineItem[]) {
  const userId = await requirePro()

  if (!data.jobId) throw new Error('A job is required for change orders.')
  if (items.length === 0) throw new Error('Add at least one line item to the change order.')

  const lineItems: LineItemInput[] = items.map((item, i) => ({
    parentId: '',
    parentType: 'change_order' as const,
    type: item.type as LineItemInput['type'],
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    total: String(item.total),
    sortOrder: i,
    markupPercent: null,
    section: null,
  }))

  const co = await dbAdapter.changeOrders.create(userId, {
    jobId: data.jobId,
    estimateId: data.estimateId || null,
    number: '',
    description: data.description || null,
    status: (data.status as 'draft') || 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    shareToken: null,
    signatureDataUrl: null,
    signedByName: null,
    signedAt: null,
    notes: data.notes || null,
  }, lineItems)

  revalidatePath('/[locale]/jobs', 'page')
  return co
}

export async function updateChangeOrder(id: string, data: Partial<{
  status: string; description: string; notes: string
  subtotal: number; tax: number; total: number
}>) {
  const userId = await requirePro()
  const co = await dbAdapter.changeOrders.update(id, userId, {
    ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' },
    ...data.description !== undefined && { description: data.description },
    ...data.notes !== undefined && { notes: data.notes },
    ...data.subtotal !== undefined && { subtotal: String(data.subtotal) },
    ...data.tax !== undefined && { tax: String(data.tax) },
    ...data.total !== undefined && { total: String(data.total) },
  })

  // Generate share token and send email when status changes to "sent"
  if (data.status === 'sent') {
    const token = co.shareToken || crypto.randomUUID()
    if (!co.shareToken) {
      await dbAdapter.changeOrders.update(id, userId, { shareToken: token }).catch(() => null)
    }
    // Send email to client with portal link
    if (co.jobId) {
      const job = await dbAdapter.jobs.findById(co.jobId, userId)
      if (job?.clientEmail) {
        const user = await dbAdapter.users.findById(userId)
        const contractorName = [user?.name, user?.companyName].filter(Boolean).join(' · ') || 'Your Contractor'
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
        const portalUrl = `${appUrl}/en/portal/${token}`
        await emailAdapter.send({
          to: job.clientEmail,
          replyTo: user?.email,
          subject: `Change Order ${co.number} from ${contractorName} — $${parseFloat(co.total).toFixed(2)}`,
          html: `<h2>Change Order ${co.number}</h2><p>Hi ${job.clientName},</p><p>${contractorName} has sent you a change order for <strong>$${parseFloat(co.total).toFixed(2)}</strong>.</p>${co.description ? `<p>${co.description}</p>` : ''}<p><a href="${portalUrl}" style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Review & Approve</a></p><p style="color:#999;font-size:12px;">Powered by WorkPilot</p>`,
        }).catch(err => console.error('[CO email] failed:', err))
      }
    }
  }

  // Nodo H: When approved, add CO total to job budget
  if (data.status === 'approved' && co.jobId) {
    const job = await dbAdapter.jobs.findById(co.jobId, userId)
    if (job) {
      const currentBudget = parseFloat(job.budgetedCost) || 0
      const coTotal = parseFloat(co.total) || 0
      await dbAdapter.jobs.update(co.jobId, userId, {
        budgetedCost: String(currentBudget + coTotal),
      }).catch(() => null)
    }
  }

  revalidatePath('/[locale]/jobs', 'page')
  revalidatePath('/[locale]/jobs/[id]', 'page')
  return co
}

export async function deleteChangeOrder(id: string) {
  const userId = await requirePro()
  await dbAdapter.changeOrders.delete(id, userId)
  revalidatePath('/[locale]/jobs', 'page')
}
