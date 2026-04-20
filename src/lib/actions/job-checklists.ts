'use server'

import { requireUser as requireAuth } from './auth-helpers'
import { db } from '@/db'
import { jobChecklistItems } from '@/db/schema/job-checklists'
import { jobs } from '@/db/schema/jobs'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/** Fetch checklist items for a job (ownership-checked via jobs.user_id). */
export async function getJobChecklistItems(jobId: string) {
  const userId = await requireAuth()
  // Ownership check
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
  if (!job) return []
  const rows = await db.select().from(jobChecklistItems)
    .where(eq(jobChecklistItems.jobId, jobId))
    .orderBy(jobChecklistItems.sortOrder)
  return rows
}

/** Toggle completion of a single checklist item. */
export async function toggleJobChecklistItem(id: string, completed: boolean) {
  const userId = await requireAuth()
  // Get the item + its job, check ownership
  const [item] = await db.select({
    id: jobChecklistItems.id,
    jobId: jobChecklistItems.jobId,
  }).from(jobChecklistItems).where(eq(jobChecklistItems.id, id))
  if (!item) throw new Error('Checklist item not found')
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, item.jobId), eq(jobs.userId, userId)))
  if (!job) throw new Error('Not authorized')

  await db.update(jobChecklistItems)
    .set({ completed, completedAt: completed ? new Date() : null })
    .where(eq(jobChecklistItems.id, id))

  revalidatePath('/[locale]/projects/[id]', 'page')
}
