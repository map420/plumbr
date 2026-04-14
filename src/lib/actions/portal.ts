'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'
import { revalidatePath } from 'next/cache'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'

export async function generateEstimateShareToken(id: string): Promise<string> {
  const userId = await requireAuth()
  const token = crypto.randomUUID()
  await dbAdapter.estimates.update(id, userId, { shareToken: token })
  return `${appUrl}/en/portal/${token}`
}

export async function generateInvoiceShareToken(id: string): Promise<string> {
  const userId = await requireAuth()
  const token = crypto.randomUUID()
  await dbAdapter.invoices.update(id, userId, { shareToken: token })
  return `${appUrl}/en/portal/${token}`
}

export async function getPortalData(token: string) {
  const estimate = await dbAdapter.estimates.findByToken(token)
  if (estimate) {
    const lineItems = await dbAdapter.lineItems.findByParent(estimate.id, 'estimate')
    return { type: 'estimate' as const, estimate, lineItems }
  }
  const invoice = await dbAdapter.invoices.findByToken(token)
  if (invoice) {
    const lineItems = await dbAdapter.lineItems.findByParent(invoice.id, 'invoice')
    return { type: 'invoice' as const, invoice, lineItems }
  }
  return null
}

export async function approveEstimateByToken(token: string) {
  const estimate = await dbAdapter.estimates.findByToken(token)
  if (!estimate) throw new Error('Not found')
  await dbAdapter.estimates.update(estimate.id, estimate.userId, { status: 'approved' })
  // Trigger job activation if linked
  if (estimate.jobId) {
    await dbAdapter.jobs.update(estimate.jobId, estimate.userId, { status: 'active' })
      .catch(() => null)
  }
  // Notification
  await dbAdapter.notifications.create(estimate.userId, {
    type: 'estimate_approved',
    title: `Estimate ${estimate.number} approved`,
    body: `${estimate.clientName} approved $${parseFloat(estimate.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    href: `/en/estimates/${estimate.id}`,
    read: false,
  }).catch(() => null)
  revalidatePath(`/en/estimates/${estimate.id}`)
}

export async function rejectEstimateByToken(token: string) {
  const estimate = await dbAdapter.estimates.findByToken(token)
  if (!estimate) throw new Error('Not found')
  await dbAdapter.estimates.update(estimate.id, estimate.userId, { status: 'rejected' })
  revalidatePath(`/en/estimates/${estimate.id}`)
}
