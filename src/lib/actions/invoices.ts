'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { paymentsAdapter } from '@/lib/adapters/payments'
import { revalidatePath } from 'next/cache'
import type { LineItemInput } from '@/lib/adapters/db/types'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getInvoices() {
  const userId = await requireAuth()
  return dbAdapter.invoices.findAll(userId)
}

export async function getInvoice(id: string) {
  const userId = await requireAuth()
  return dbAdapter.invoices.findById(id, userId)
}

export async function getInvoicesByJob(jobId: string) {
  const userId = await requireAuth()
  return dbAdapter.invoices.findByJob(jobId, userId)
}

export async function getInvoiceLineItems(invoiceId: string) {
  return dbAdapter.lineItems.findByParent(invoiceId, 'invoice')
}

type RawLineItem = { type: string; description: string; quantity: number; unitPrice: number; total: number }

export async function createInvoice(data: {
  jobId: string; estimateId: string; clientName: string; clientEmail: string
  status: string; subtotal: number; tax: number; total: number
  dueDate: string; notes: string
}, items: RawLineItem[]) {
  const userId = await requireAuth()
  const lineItems: LineItemInput[] = items.map((item, i) => ({
    parentId: '',
    parentType: 'invoice' as const,
    type: item.type as LineItemInput['type'],
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    total: String(item.total),
    sortOrder: i,
  }))

  const invoice = await dbAdapter.invoices.create(userId, {
    jobId: data.jobId || null,
    estimateId: data.estimateId || null,
    number: '',
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    status: data.status as 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    paidAt: null,
    notes: data.notes || null,
    stripePaymentIntentId: null,
  }, lineItems)

  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}

export async function createInvoicePaymentLink(id: string): Promise<{ url: string }> {
  const userId = await requireAuth()
  const invoice = await dbAdapter.invoices.findById(id, userId)
  if (!invoice) throw new Error('Invoice not found')

  const amountCents = Math.round(parseFloat(invoice.total) * 100)
  const { url } = await paymentsAdapter.createPaymentLink({
    amountCents,
    currency: 'usd',
    description: `Invoice ${invoice.number} — ${invoice.clientName}`,
    metadata: { invoiceId: invoice.id, userId },
  })

  // Mark as sent if still draft
  if (invoice.status === 'draft') {
    await dbAdapter.invoices.update(id, userId, { status: 'sent' })
    revalidatePath('/[locale]/invoices/[id]', 'page')
  }

  return { url }
}

export async function updateInvoice(id: string, data: Partial<{
  status: string; paidAt: string
}>) {
  const userId = await requireAuth()
  const invoice = await dbAdapter.invoices.update(id, userId, {
    ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' },
    ...data.paidAt !== undefined && { paidAt: data.paidAt ? new Date(data.paidAt) : null },
  })
  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}
