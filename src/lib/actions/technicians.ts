'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getTechnicians() {
  const userId = await requireAuth()
  return dbAdapter.technicians.findAll(userId)
}

export async function createTechnician(data: { name: string; email: string; phone: string }) {
  const userId = await requireAuth()
  const t = await dbAdapter.technicians.create(userId, {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
  })
  revalidatePath('/[locale]/team', 'page')
  return t
}

export async function updateTechnician(id: string, data: Partial<{ name: string; email: string; phone: string }>) {
  const userId = await requireAuth()
  const t = await dbAdapter.technicians.update(id, userId, {
    ...data.name !== undefined && { name: data.name },
    ...data.email !== undefined && { email: data.email },
    ...data.phone !== undefined && { phone: data.phone || null },
  })
  revalidatePath('/[locale]/team', 'page')
  return t
}

export async function deleteTechnician(id: string) {
  const userId = await requireAuth()
  await dbAdapter.technicians.delete(id, userId)
  revalidatePath('/[locale]/team', 'page')
}

export async function assignTechnicianToJob(jobId: string, technicianId: string) {
  await requireAuth()
  await dbAdapter.technicians.assignToJob(jobId, technicianId)
  revalidatePath('/[locale]/jobs/[id]', 'page')
}

export async function removeTechnicianFromJob(jobId: string, technicianId: string) {
  await requireAuth()
  await dbAdapter.technicians.removeFromJob(jobId, technicianId)
  revalidatePath('/[locale]/jobs/[id]', 'page')
}

export async function getTechniciansByJob(jobId: string) {
  await requireAuth()
  return dbAdapter.technicians.findByJob(jobId)
}
