'use server'
import { requireUser as requireAuth } from './auth-helpers'

import { dbAdapter } from '@/lib/adapters/db'
import { emailAdapter } from '@/lib/adapters/email'
import { paymentsAdapter } from '@/lib/adapters/payments'
import { invoiceSentEmail } from '@/lib/email-templates'
import { revalidatePath } from 'next/cache'
import type { LineItemInput } from '@/lib/adapters/db/types'


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
    shareToken: null,
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

export async function sendInvoiceToClient(id: string): Promise<{ sent: boolean; error?: string }> {
  const userId = await requireAuth()
  const [invoice, user] = await Promise.all([
    dbAdapter.invoices.findById(id, userId),
    dbAdapter.users.findById(userId),
  ])
  if (!invoice) throw new Error('Invoice not found')
  if (!invoice.clientEmail) return { sent: false, error: 'No client email on this invoice.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://plumbr.mrlabs.io'
  const contractorName = user?.companyName || user?.name || 'Your contractor'
  // Generate share token so client can view invoice online
  const token = invoice.shareToken ?? crypto.randomUUID()
  if (!invoice.shareToken) {
    await dbAdapter.invoices.update(id, userId, { shareToken: token }).catch(() => null)
  }
  const portalUrl = `${appUrl}/en/portal/${token}`

  await emailAdapter.send({
    to: invoice.clientEmail,
    replyTo: user?.email,
    subject: `Invoice ${invoice.number} from ${contractorName} — $${parseFloat(invoice.total).toLocaleString()}`,
    html: invoiceSentEmail({
      clientName: invoice.clientName,
      invoiceNumber: invoice.number,
      total: invoice.total,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      notes: invoice.notes,
      contractorName,
      portalUrl,
    }),
  })

  if (invoice.status === 'draft') {
    await dbAdapter.invoices.update(id, userId, { status: 'sent' })
    revalidatePath('/[locale]/invoices/[id]', 'page')
    revalidatePath('/[locale]/invoices', 'page')
  }

  return { sent: true }
}

export async function updateInvoice(id: string, data: Partial<{
  status: string; paidAt: string
}>) {
  const userId = await requireAuth()
  const previous = await dbAdapter.invoices.findById(id, userId)
  const invoice = await dbAdapter.invoices.update(id, userId, {
    ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' },
    ...data.paidAt !== undefined && { paidAt: data.paidAt ? new Date(data.paidAt) : null },
  })

  // Notification — Invoice marked Paid
  if (data.status === 'paid' && previous?.status !== 'paid') {
    await dbAdapter.notifications.create(userId, {
      type: 'invoice_paid',
      title: `Invoice ${invoice.number} paid`,
      body: `${invoice.clientName} paid $${parseFloat(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      href: `/en/invoices/${invoice.id}`,
      read: false,
    }).catch(err => console.error('[NOTIF] invoice_paid failed:', err))
  }

  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}
