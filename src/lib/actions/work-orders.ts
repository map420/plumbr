'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import { isPro } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { requireUser as requireAuth } from './auth-helpers'

async function requirePro() {
  const userId = await requireAuth()
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    throw new Error('PLAN_LIMIT: Upgrade to Pro to use Work Orders.')
  }
  return userId
}

export async function getWorkOrders() {
  const userId = await requirePro()
  return dbAdapter.workOrders.findAll(userId)
}

export async function getWorkOrdersByJob(jobId: string) {
  const userId = await requirePro()
  return dbAdapter.workOrders.findByJob(jobId, userId)
}

export async function createWorkOrder(data: {
  jobId: string; title: string; instructions?: string
  scheduledDate?: string; assignedTechnicianIds?: string[]
}) {
  const userId = await requirePro()

  if (!data.jobId) throw new Error('A job is required for work orders.')
  if (!data.title?.trim()) throw new Error('Work order title is required.')

  const wo = await dbAdapter.workOrders.create(userId, {
    jobId: data.jobId,
    number: '',
    title: data.title.trim(),
    instructions: data.instructions || null,
    scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
    status: 'pending',
    assignedTechnicianIds: data.assignedTechnicianIds ?? [],
  })

  revalidatePath('/[locale]/jobs', 'page')
  return wo
}

/**
 * Auto-generate a Work Order from an approved Estimate.
 * Strips pricing, keeps line item descriptions as instructions.
 */
export async function generateWorkOrderFromEstimate(jobId: string, estimateId: string) {
  const userId = await requirePro()

  const estimate = await dbAdapter.estimates.findById(estimateId, userId)
  if (!estimate) throw new Error('Estimate not found.')

  const lineItems = await dbAdapter.lineItems.findByParent(estimateId, 'estimate')

  // Build instructions from estimate line items (descriptions only, no pricing)
  const instructionLines = lineItems
    .map((item, i) => `${i + 1}. ${item.description}${item.quantity !== '1' ? ` (Qty: ${item.quantity})` : ''}`)
    .join('\n')

  const instructions = [
    estimate.notes ? `Notes: ${estimate.notes}` : '',
    instructionLines ? `\nScope of work:\n${instructionLines}` : '',
  ].filter(Boolean).join('\n')

  const wo = await dbAdapter.workOrders.create(userId, {
    jobId,
    number: '',
    title: `Work Order — ${estimate.clientName} (${estimate.number})`,
    instructions: instructions || null,
    scheduledDate: null,
    status: 'pending',
    assignedTechnicianIds: [],
  })

  revalidatePath('/[locale]/jobs', 'page')
  return wo
}

export async function updateWorkOrder(id: string, data: Partial<{
  title: string; instructions: string; scheduledDate: string
  status: string; assignedTechnicianIds: string[]
}>) {
  const userId = await requirePro()
  const wo = await dbAdapter.workOrders.update(id, userId, {
    ...data.title !== undefined && { title: data.title },
    ...data.instructions !== undefined && { instructions: data.instructions },
    ...data.scheduledDate !== undefined && { scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null },
    ...data.status !== undefined && { status: data.status as 'pending' | 'in_progress' | 'completed' },
    ...data.assignedTechnicianIds !== undefined && { assignedTechnicianIds: data.assignedTechnicianIds },
  })

  revalidatePath('/[locale]/jobs', 'page')
  return wo
}

export async function deleteWorkOrder(id: string) {
  const userId = await requirePro()
  await dbAdapter.workOrders.delete(id, userId)
  revalidatePath('/[locale]/jobs', 'page')
}
