'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import type { LineItemInput } from '@/lib/adapters/db/types'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

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
  jobId: string; clientName: string; clientEmail: string; status: string
  subtotal: number; tax: number; total: number; notes: string; validUntil: string
}, items: RawLineItem[]) {
  const userId = await requireAuth()
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
    number: '',
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    status: data.status as 'draft',
    subtotal: String(data.subtotal),
    tax: String(data.tax),
    total: String(data.total),
    notes: data.notes || null,
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    convertedToInvoiceId: null,
  }, lineItems)

  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function updateEstimate(id: string, data: Partial<{
  status: string; notes: string; convertedToInvoiceId: string
}>) {
  const userId = await requireAuth()
  const estimate = await dbAdapter.estimates.update(id, userId, {
    ...data.status !== undefined && { status: data.status as 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' },
    ...data.notes !== undefined && { notes: data.notes },
    ...data.convertedToInvoiceId !== undefined && { convertedToInvoiceId: data.convertedToInvoiceId || null },
  })
  revalidatePath('/[locale]/estimates', 'page')
  return estimate
}

export async function deleteEstimate(id: string) {
  const userId = await requireAuth()
  await dbAdapter.estimates.delete(id, userId)
  revalidatePath('/[locale]/estimates', 'page')
}
