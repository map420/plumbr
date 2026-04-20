'use server'

import { requireUser as requireAuth } from './auth-helpers'
import { db } from '@/db'
import { jobClockSessions } from '@/db/schema/job-clock-sessions'
import { jobs } from '@/db/schema/jobs'
import { technicians } from '@/db/schema/technicians'
import { expenses } from '@/db/schema/expenses'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { invalidateUserData } from '@/lib/cache-tags'

export type ActiveClockSession = {
  id: string
  jobId: string
  technicianId: string | null
  technicianName: string | null
  hourlyRate: string | null
  startedAt: Date
}

/** Returns the current open session for a job (ended_at IS NULL), or null. */
export async function getActiveClockSession(jobId: string): Promise<ActiveClockSession | null> {
  const userId = await requireAuth()
  // Ownership check via join
  const rows = await db
    .select({
      id: jobClockSessions.id,
      jobId: jobClockSessions.jobId,
      technicianId: jobClockSessions.technicianId,
      startedAt: jobClockSessions.startedAt,
      technicianName: technicians.name,
      hourlyRate: technicians.hourlyRate,
    })
    .from(jobClockSessions)
    .leftJoin(technicians, eq(technicians.id, jobClockSessions.technicianId))
    .innerJoin(jobs, eq(jobs.id, jobClockSessions.jobId))
    .where(and(
      eq(jobClockSessions.jobId, jobId),
      isNull(jobClockSessions.endedAt),
      eq(jobs.userId, userId),
    ))
    .orderBy(desc(jobClockSessions.startedAt))
    .limit(1)
  return rows[0] ?? null
}

/** Starts a clock session for a job/tech. Throws if another session is already active. */
export async function startClock(jobId: string, technicianId: string | null): Promise<ActiveClockSession> {
  const userId = await requireAuth()

  // Ownership
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
  if (!job) throw new Error('Job not found or not authorized')

  // Ensure no active session (unique index enforces, but explicit error is cleaner)
  const existing = await getActiveClockSession(jobId)
  if (existing) throw new Error('A clock session is already active for this job. Stop it first.')

  const [inserted] = await db.insert(jobClockSessions).values({
    userId,
    jobId,
    technicianId: technicianId ?? null,
    startedAt: new Date(),
  }).returning()

  // Fetch tech info for return shape
  const active = await getActiveClockSession(jobId)
  if (!active) throw new Error('Failed to start session')
  void inserted
  invalidateUserData(userId)
  revalidatePath('/[locale]/projects/[id]', 'page')
  return active
}

/** Stops a clock session, computes hours + cost, creates labor expense, links it. */
export async function stopClock(sessionId: string): Promise<{ hours: number; amount: number; expenseId: string | null }> {
  const userId = await requireAuth()

  // Load session + ownership
  const [session] = await db
    .select({
      id: jobClockSessions.id,
      jobId: jobClockSessions.jobId,
      technicianId: jobClockSessions.technicianId,
      startedAt: jobClockSessions.startedAt,
      endedAt: jobClockSessions.endedAt,
      hourlyRate: technicians.hourlyRate,
    })
    .from(jobClockSessions)
    .leftJoin(technicians, eq(technicians.id, jobClockSessions.technicianId))
    .innerJoin(jobs, eq(jobs.id, jobClockSessions.jobId))
    .where(and(eq(jobClockSessions.id, sessionId), eq(jobs.userId, userId)))
  if (!session) throw new Error('Session not found')
  if (session.endedAt) throw new Error('Session already stopped')

  const endedAt = new Date()
  const ms = endedAt.getTime() - new Date(session.startedAt).getTime()
  const hours = Math.round((ms / 3_600_000) * 100) / 100 // 2 decimals
  const rate = session.hourlyRate ? parseFloat(session.hourlyRate) : 0
  const amount = Math.round(hours * rate * 100) / 100

  // Create labor expense only if we have a tech with rate; else skip and just close session
  let expenseId: string | null = null
  if (session.technicianId && rate > 0 && hours > 0) {
    const [exp] = await db.insert(expenses).values({
      userId,
      jobId: session.jobId,
      description: `Clock-in labor (${hours}h)`,
      type: 'labor',
      amount: amount.toFixed(2),
      technicianId: session.technicianId,
      hours: hours.toFixed(2),
      ratePerHour: rate.toFixed(2),
      date: endedAt,
    }).returning({ id: expenses.id })
    expenseId = exp.id
  }

  await db.update(jobClockSessions)
    .set({ endedAt, expenseId })
    .where(eq(jobClockSessions.id, sessionId))

  invalidateUserData(userId)
  revalidatePath('/[locale]/projects/[id]', 'page')
  return { hours, amount, expenseId }
}
