'use server'

import { revalidatePath } from 'next/cache'
import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'

export async function getChecklist(jobId: string) {
  await requireAuth()
  return dbAdapter.jobChecklist.findByJob(jobId)
}

export async function addChecklistItem(jobId: string, label: string) {
  await requireAuth()
  const existing = await dbAdapter.jobChecklist.findByJob(jobId)
  const item = await dbAdapter.jobChecklist.create({
    jobId, label, sortOrder: existing.length,
  })
  revalidatePath('/[locale]/field', 'page')
  return item
}

export async function toggleChecklistItem(id: string, completed: boolean) {
  await requireAuth()
  const item = await dbAdapter.jobChecklist.update(id, {
    completed,
    completedAt: completed ? new Date() : null,
  })
  revalidatePath('/[locale]/field', 'page')
  return item
}

export async function deleteChecklistItem(id: string) {
  await requireAuth()
  await dbAdapter.jobChecklist.delete(id)
  revalidatePath('/[locale]/field', 'page')
}

export async function initializeChecklist(jobId: string) {
  await requireAuth()
  const existing = await dbAdapter.jobChecklist.findByJob(jobId)
  if (existing.length > 0) return existing
  return dbAdapter.jobChecklist.createDefaults(jobId)
}
