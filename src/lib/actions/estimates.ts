'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { estimates } from '@/db/schema/estimates'
import { lineItems } from '@/db/schema/line-items'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

async function nextEstimateNumber(userId: string) {
  const rows = await db.select({ number: estimates.number }).from(estimates).where(eq(estimates.userId, userId))
  const max = rows.reduce((acc, r) => {
    const n = parseInt(r.number.replace('EST-', ''), 10)
    return isNaN(n) ? acc : Math.max(acc, n)
  }, 0)
  return `EST-${String(max + 1).padStart(3, '0')}`
}

export async function getEstimates() {
  const userId = await requireAuth()
  return db.select().from(estimates).where(eq(estimates.userId, userId)).orderBy(desc(estimates.createdAt))
}

export async function getEstimate(id: string) {
  const userId = await requireAuth()
  const rows = await db.select().from(estimates).where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
  return rows[0] ?? null
}

export async function getEstimatesByJob(jobId: string) {
  const userId = await requireAuth()
  return db.select().from(estimates).where(and(eq(estimates.jobId, jobId), eq(estimates.userId, userId)))
}

export async function getLineItems(estimateId: string) {
  return db.select().from(lineItems)
    .where(and(eq(lineItems.parentId, estimateId), eq(lineItems.parentType, 'estimate')))
    .orderBy(lineItems.sortOrder)
}

type LineItemInput = { type: string; description: string; quantity: number; unitPrice: number; total: number }

export async function createEstimate(data: {
  jobId: string; clientName: string; clientEmail: string; status: string
  subtotal: number; tax: number; total: number; notes: string; validUntil: string
}, items: LineItemInput[]) {
  const userId = await requireAuth()
  const number = await nextEstimateNumber(userId)
  const [estimate] = await db.insert(estimates).values({
    userId,
    jobId: data.jobId || null,
    number,
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    status: data.status as 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    notes: data.notes || null,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    convertedToInvoiceId: null,
  }).returning()

  if (items.length > 0) {
    await db.insert(lineItems).values(items.map((item, i) => ({
      parentId: estimate.id,
      parentType: 'estimate' as const,
      type: item.type as 'labor' | 'material' | 'subcontractor' | 'other',
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      total: String(item.total),
      sortOrder: i,
    })))
  }

  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function updateEstimate(id: string, data: Partial<{
  status: string; notes: string; convertedToInvoiceId: string
}>) {
  const userId = await requireAuth()
  const [estimate] = await db.update(estimates)
    .set({ ...data, status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | undefined, updatedAt: new Date() })
    .where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
    .returning()
  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function deleteEstimate(id: string) {
  const userId = await requireAuth()
  await db.delete(lineItems).where(and(eq(lineItems.parentId, id), eq(lineItems.parentType, 'estimate')))
  await db.delete(estimates).where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
  revalidatePath('/[locale]/estimates', 'page')
}
