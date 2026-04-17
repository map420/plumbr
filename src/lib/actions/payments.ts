'use server'
import { requireUser as requireAuth } from './auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import { invalidateUserData } from '@/lib/cache-tags'
import type { PaymentType, PaymentMethod } from '@/lib/adapters/db/types'

export async function getPaymentsByInvoice(invoiceId: string) {
  await requireAuth()
  return dbAdapter.payments.findByInvoice(invoiceId)
}

export async function recordPayment(data: {
  invoiceId?: string
  estimateId?: string
  type: PaymentType
  amount: number
  method: PaymentMethod
  referenceNumber?: string
}) {
  const userId = await requireAuth()
  const payment = await dbAdapter.payments.create(userId, {
    invoiceId: data.invoiceId ?? null,
    estimateId: data.estimateId ?? null,
    type: data.type,
    amount: String(data.amount),
    status: 'pending',
    method: data.method,
    stripePaymentIntentId: null,
    referenceNumber: data.referenceNumber ?? null,
    paidAt: null,
  })

  revalidatePath('/[locale]/invoices', 'page')
  invalidateUserData(userId)
  return payment
}

export async function createMilestones(
  invoiceId: string,
  milestones: { name: string; amountPercent: number; amount: number; dueDate?: string }[]
) {
  const userId = await requireAuth()
  const created = await Promise.all(
    milestones.map((m, i) =>
      dbAdapter.milestones.create({
        invoiceId,
        name: m.name,
        amountPercent: String(m.amountPercent),
        amount: String(m.amount),
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
        status: 'pending',
        stripePaymentIntentId: null,
        paidAt: null,
        sortOrder: i,
      })
    )
  )

  revalidatePath('/[locale]/invoices', 'page')
  invalidateUserData(userId)
  return created
}

export async function getMilestonesByInvoice(invoiceId: string) {
  await requireAuth()
  return dbAdapter.milestones.findByInvoice(invoiceId)
}
