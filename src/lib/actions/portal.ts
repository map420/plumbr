'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { paymentsAdapter } from '@/lib/adapters/payments'
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

/**
 * Public payment link generation for invoice portal. Bearer auth via shareToken —
 * anyone with the token can trigger a Stripe Checkout. Routes to contractor's
 * connected Stripe account (Direct Charge, funds go straight to contractor).
 * Returns { error } if contractor doesn't have Connect onboarded or invoice already paid.
 */
export async function createPortalInvoicePaymentLink(token: string): Promise<{ url?: string; error?: string }> {
  const invoice = await dbAdapter.invoices.findByToken(token)
  if (!invoice) return { error: 'Invoice not found or link expired.' }
  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    return { error: 'This invoice is not open for payment.' }
  }

  const user = await dbAdapter.users.findById(invoice.userId)
  if (!user?.stripeAccountId || !user?.stripeAccountChargesEnabled) {
    return { error: 'Online payments are not enabled for this contractor yet.' }
  }

  const amountCents = Math.round(parseFloat(invoice.total) * 100)
  const { url } = await paymentsAdapter.createPaymentLink({
    amountCents,
    currency: 'usd',
    description: `Invoice ${invoice.number} — ${invoice.clientName}`,
    metadata: { invoiceId: invoice.id, userId: invoice.userId, source: 'portal' },
    stripeAccount: user.stripeAccountId,
  })
  return { url }
}

export async function getPortalData(token: string) {
  // Parallelize the 3 findByToken lookups — only one can hit, but waiting
  // sequentially added ~3s TTFB for portal. Line items then fetched in a
  // second round-trip only for whichever parent exists.
  const [estimate, invoice, changeOrder] = await Promise.all([
    dbAdapter.estimates.findByToken(token).catch(() => null),
    dbAdapter.invoices.findByToken(token).catch(() => null),
    dbAdapter.changeOrders.findByToken(token).catch(() => null),
  ])

  if (estimate) {
    const lineItems = await dbAdapter.lineItems.findByParent(estimate.id, 'estimate')
    return { type: 'estimate' as const, estimate, lineItems }
  }
  if (invoice) {
    const lineItems = await dbAdapter.lineItems.findByParent(invoice.id, 'invoice')
    return { type: 'invoice' as const, invoice, lineItems }
  }
  if (changeOrder) {
    const lineItems = await dbAdapter.lineItems.findByParent(changeOrder.id, 'change_order')
    return { type: 'change_order' as const, changeOrder, lineItems }
  }
  return null
}

export async function approveEstimateByToken(
  token: string,
  signatureData?: { signatureDataUrl?: string; signedByName?: string; signedByEmail?: string }
) {
  const estimate = await dbAdapter.estimates.findByToken(token)
  if (!estimate) throw new Error('Not found')
  const updateData: Record<string, unknown> = { status: 'approved' }
  if (signatureData?.signatureDataUrl) {
    updateData.signatureDataUrl = signatureData.signatureDataUrl
    updateData.signedByName = signatureData.signedByName ?? null
    updateData.signedByEmail = signatureData.signedByEmail ?? null
    updateData.signedAt = new Date()
  }
  await dbAdapter.estimates.update(estimate.id, estimate.userId, updateData as Parameters<typeof dbAdapter.estimates.update>[2])

  // K — Job activation: activate existing job, or create new one
  let jobId = estimate.jobId
  if (jobId) {
    await dbAdapter.jobs.update(jobId, estimate.userId, { status: 'active' }).catch(() => null)
  } else {
    // Auto-create job from estimate
    const job = await dbAdapter.jobs.create(estimate.userId, {
      clientId: estimate.clientId,
      name: `Job for ${estimate.clientName}`,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      clientPhone: estimate.clientPhone,
      address: null,
      status: 'active',
      budgetedCost: estimate.total,
      actualCost: '0',
      startDate: new Date(),
      endDate: null,
      notes: `Auto-created from ${estimate.number}`,
    }).catch(() => null)
    if (job) {
      jobId = job.id
      await dbAdapter.estimates.update(estimate.id, estimate.userId, { jobId: job.id } as any).catch(() => null)
    }
  }

  // L — Auto-generate invoice if toggle is ON
  if ((estimate as any).autoGenerateInvoice && jobId) {
    const lineItems = await dbAdapter.lineItems.findByParent(estimate.id, 'estimate')
    const invoiceItems = lineItems.map(li => ({
      parentId: '',
      parentType: 'invoice' as const,
      type: li.type,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      total: li.total,
      markupPercent: li.markupPercent,
      section: li.section,
      sortOrder: li.sortOrder,
    }))
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const invoice = await dbAdapter.invoices.create(estimate.userId, {
      jobId,
      estimateId: estimate.id,
      number: '',
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      status: 'draft',
      subtotal: estimate.subtotal,
      tax: estimate.tax,
      total: estimate.total,
      dueDate,
      paidAt: null,
      notes: estimate.notes,
      stripePaymentIntentId: null,
      shareToken: null,
    } as any, invoiceItems as any).catch(() => null)
    if (invoice) {
      await dbAdapter.estimates.update(estimate.id, estimate.userId, {
        status: 'converted',
        convertedToInvoiceId: invoice.id,
      } as any).catch(() => null)
    }
  }

  // M — Notification to contractor
  await dbAdapter.notifications.create(estimate.userId, {
    type: 'estimate_approved',
    title: `Estimate ${estimate.number} approved`,
    body: `${estimate.clientName} approved $${parseFloat(estimate.total).toFixed(2)}`,
    href: `/en/estimates/${estimate.id}`,
    read: false,
  }).catch(() => null)
  // Invalidar todos los paths del estimate en ambos locales (C7 — signed chip no aparecía por cache).
  revalidatePath('/[locale]/estimates/[id]', 'page')
  revalidatePath('/[locale]/estimates', 'page')
  revalidatePath('/[locale]/clients/[id]', 'page')
  revalidatePath('/[locale]/projects', 'page')
  revalidatePath('/[locale]/invoices', 'page')
}

export async function rejectEstimateByToken(token: string, reason?: string) {
  const estimate = await dbAdapter.estimates.findByToken(token)
  if (!estimate) throw new Error('Not found')
  await dbAdapter.estimates.update(estimate.id, estimate.userId, { status: 'rejected' })
  // Notification to contractor about rejection with reason
  const reasonText = reason ? ` — Reason: "${reason}"` : ''
  await dbAdapter.notifications.create(estimate.userId, {
    type: 'estimate_approved',
    title: `Estimate ${estimate.number} declined`,
    body: `${estimate.clientName} declined $${parseFloat(estimate.total).toFixed(2)}${reasonText}`,
    href: `/en/estimates/${estimate.id}`,
    read: false,
  }).catch(() => null)
  revalidatePath('/[locale]/estimates/[id]', 'page')
  revalidatePath('/[locale]/estimates', 'page')
}

// Change Order approval via portal
export async function approveChangeOrderByToken(
  token: string,
  signatureData?: { signatureDataUrl?: string; signedByName?: string }
) {
  const co = await dbAdapter.changeOrders.findByToken(token)
  if (!co) throw new Error('Not found')

  const updateData: Record<string, unknown> = { status: 'approved' }
  if (signatureData?.signatureDataUrl) {
    updateData.signatureDataUrl = signatureData.signatureDataUrl
    updateData.signedByName = signatureData.signedByName ?? null
    updateData.signedAt = new Date()
  }
  await dbAdapter.changeOrders.update(co.id, co.userId, updateData as any)

  // Add CO total to job budget
  if (co.jobId) {
    const job = await dbAdapter.jobs.findById(co.jobId, co.userId)
    if (job) {
      const currentBudget = parseFloat(job.budgetedCost) || 0
      const coTotal = parseFloat(co.total) || 0
      await dbAdapter.jobs.update(co.jobId, co.userId, { budgetedCost: String(currentBudget + coTotal) }).catch(() => null)
    }
  }

  // Notification
  await dbAdapter.notifications.create(co.userId, {
    type: 'estimate_approved',
    title: `Change Order ${co.number} approved`,
    body: `Client approved change order for $${parseFloat(co.total).toFixed(2)}`,
    href: `/en/projects/${co.jobId}`,
    read: false,
  }).catch(() => null)

  revalidatePath('/[locale]/projects', 'page')
}

export async function rejectChangeOrderByToken(token: string, reason?: string) {
  const co = await dbAdapter.changeOrders.findByToken(token)
  if (!co) throw new Error('Not found')
  await dbAdapter.changeOrders.update(co.id, co.userId, { status: 'rejected' } as any)

  const reasonText = reason ? ` — Reason: "${reason}"` : ''
  await dbAdapter.notifications.create(co.userId, {
    type: 'estimate_approved',
    title: `Change Order ${co.number} declined`,
    body: `Client declined change order for $${parseFloat(co.total).toFixed(2)}${reasonText}`,
    href: `/en/projects/${co.jobId}`,
    read: false,
  }).catch(() => null)

  revalidatePath('/[locale]/projects', 'page')
}
