'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getJobs() {
  const userId = await requireAuth()
  return dbAdapter.jobs.findAll(userId)
}

export async function getJob(id: string) {
  const userId = await requireAuth()
  return dbAdapter.jobs.findById(id, userId)
}

export async function createJob(data: {
  name: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}) {
  const userId = await requireAuth()
  const job = await dbAdapter.jobs.create(userId, {
    clientId: null,
    name: data.name,
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    address: data.address || null,
    status: data.status as 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled',
    budgetedCost: data.budgetedCost || '0',
    actualCost: data.actualCost || '0',
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    notes: data.notes || null,
  })
  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function updateJob(id: string, data: Partial<{
  name: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}>) {
  const userId = await requireAuth()
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.clientName !== undefined) patch.clientName = data.clientName
  if (data.clientEmail !== undefined) patch.clientEmail = data.clientEmail || null
  if (data.clientPhone !== undefined) patch.clientPhone = data.clientPhone || null
  if (data.address !== undefined) patch.address = data.address || null
  if (data.status !== undefined) patch.status = data.status
  if (data.budgetedCost !== undefined) patch.budgetedCost = data.budgetedCost
  if (data.actualCost !== undefined) patch.actualCost = data.actualCost
  if (data.startDate !== undefined) patch.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.endDate !== undefined) patch.endDate = data.endDate ? new Date(data.endDate) : null
  if (data.notes !== undefined) patch.notes = data.notes || null

  const job = await dbAdapter.jobs.update(id, userId, patch as Parameters<typeof dbAdapter.jobs.update>[2])
  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function deleteJob(id: string) {
  const userId = await requireAuth()
  await dbAdapter.jobs.delete(id, userId)
  revalidatePath('/[locale]/jobs', 'page')
}
