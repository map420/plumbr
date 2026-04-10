'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { jobs } from '@/db/schema/jobs'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getJobs() {
  const userId = await requireAuth()
  return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt))
}

export async function getJob(id: string) {
  const userId = await requireAuth()
  const rows = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
  return rows[0] ?? null
}

export async function createJob(data: {
  name: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}) {
  const userId = await requireAuth()
  const [job] = await db.insert(jobs).values({
    userId,
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
  }).returning()
  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function updateJob(id: string, data: Partial<{
  name: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}>) {
  const userId = await requireAuth()
  const [job] = await db.update(jobs)
    .set({
      ...data.name !== undefined && { name: data.name },
      ...data.clientName !== undefined && { clientName: data.clientName },
      ...data.clientEmail !== undefined && { clientEmail: data.clientEmail || null },
      ...data.clientPhone !== undefined && { clientPhone: data.clientPhone || null },
      ...data.address !== undefined && { address: data.address || null },
      ...data.status !== undefined && { status: data.status as 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled' },
      ...data.budgetedCost !== undefined && { budgetedCost: data.budgetedCost },
      ...data.actualCost !== undefined && { actualCost: data.actualCost },
      ...data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null },
      ...data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null },
      ...data.notes !== undefined && { notes: data.notes || null },
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    .returning()
  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function deleteJob(id: string) {
  const userId = await requireAuth()
  await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
  revalidatePath('/[locale]/jobs', 'page')
}
