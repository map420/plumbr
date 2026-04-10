'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { invoices } from '@/db/schema/invoices'
import { lineItems } from '@/db/schema/line-items'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

async function nextInvoiceNumber(userId: string) {
  const rows = await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.userId, userId))
  const max = rows.reduce((acc, r) => {
    const n = parseInt(r.number.replace('INV-', ''), 10)
    return isNaN(n) ? acc : Math.max(acc, n)
  }, 0)
  return `INV-${String(max + 1).padStart(3, '0')}`
}

export async function getInvoices() {
  const userId = await requireAuth()
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt))
}

export async function getInvoice(id: string) {
  const userId = await requireAuth()
  const rows = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
  return rows[0] ?? null
}

export async function getInvoicesByJob(jobId: string) {
  const userId = await requireAuth()
  return db.select().from(invoices).where(and(eq(invoices.jobId, jobId), eq(invoices.userId, userId)))
}

export async function getInvoiceLineItems(invoiceId: string) {
  return db.select().from(lineItems)
    .where(and(eq(lineItems.parentId, invoiceId), eq(lineItems.parentType, 'invoice')))
    .orderBy(lineItems.sortOrder)
}

type LineItemInput = { type: string; description: string; quantity: number; unitPrice: number; total: number }

export async function createInvoice(data: {
  jobId: string; estimateId: string; clientName: string; clientEmail: string
  status: string; subtotal: number; tax: number; total: number
  dueDate: string; notes: string
}, items: LineItemInput[]) {
  const userId = await requireAuth()
  const number = await nextInvoiceNumber(userId)
  const [invoice] = await db.insert(invoices).values({
    userId,
    jobId: data.jobId || null,
    estimateId: data.estimateId || null,
    number,
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    status: data.status as 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    notes: data.notes || null,
  }).returning()

  if (items.length > 0) {
    await db.insert(lineItems).values(items.map((item, i) => ({
      parentId: invoice.id,
      parentType: 'invoice' as const,
      type: item.type as 'labor' | 'material' | 'subcontractor' | 'other',
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      total: String(item.total),
      sortOrder: i,
    })))
  }

  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}

export async function updateInvoice(id: string, data: Partial<{
  status: string; paidAt: string
}>) {
  const userId = await requireAuth()
  const [invoice] = await db.update(invoices)
    .set({
      ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' },
      ...data.paidAt !== undefined && { paidAt: data.paidAt ? new Date(data.paidAt) : null },
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning()
  revalidatePath('/[locale]/invoices', 'page')
  return invoice
}
