'use server'
import { requireUser as requireAuth } from './auth-helpers'


import { dbAdapter } from '@/lib/adapters/db'
import { db } from '@/db'
import { technicians, jobTechnicians } from '@/db/schema/technicians'
import { jobs } from '@/db/schema/jobs'
import { invoices } from '@/db/schema/invoices'
import { expenses } from '@/db/schema/expenses'
import { and, eq, gte, inArray, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import type { TechnicianType, TechnicianAvailability } from '@/lib/adapters/db/types'


export async function getTechnicians() {
  const userId = await requireAuth()
  return dbAdapter.technicians.findAll(userId)
}

type TechWithStats = Awaited<ReturnType<typeof dbAdapter.technicians.findAll>>[number] & {
  jobsMtd: number
  revenueMtd: number
  paidOutMtd: number
  activeJobContext: { jobId: string; jobName: string; clientName: string } | null
}

/**
 * Team dashboard: technicians enriched with Jobs MTD, Revenue MTD (employees),
 * Paid out MTD (subcontractors via labor/subcontractor expenses) and current active job context.
 */
export async function getTechniciansWithStats(): Promise<TechWithStats[]> {
  const userId = await requireAuth()
  const techs = await dbAdapter.technicians.findAll(userId)
  if (techs.length === 0) return []

  const techIds = techs.map(t => t.id)
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Jobs-per-tech this month (count) + revenue per tech + active job context + paid out
  const [assignments, monthInvoices, monthExpenses, activeJobRows] = await Promise.all([
    // All assignments for these techs joined with job info (status + startDate)
    db.select({
      technicianId: jobTechnicians.technicianId,
      jobId: jobs.id,
      jobStatus: jobs.status,
      jobStart: jobs.startDate,
      jobCreated: jobs.createdAt,
    })
      .from(jobTechnicians)
      .innerJoin(jobs, eq(jobTechnicians.jobId, jobs.id))
      .where(and(eq(jobs.userId, userId), inArray(jobTechnicians.technicianId, techIds))),

    // Paid invoices this month (joined with job to know tech via assignments)
    db.select({ jobId: invoices.jobId, total: invoices.total, paidAt: invoices.paidAt })
      .from(invoices)
      .where(and(
        eq(invoices.userId, userId),
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, firstOfMonth),
      )),

    // Labor + subcontractor expenses this month per tech
    db.select({ technicianId: expenses.technicianId, amount: expenses.amount, type: expenses.type, date: expenses.date })
      .from(expenses)
      .where(and(
        eq(expenses.userId, userId),
        gte(expenses.date, firstOfMonth),
      )),

    // Active job per tech (latest active/in-progress)
    db.select({
      technicianId: jobTechnicians.technicianId,
      jobId: jobs.id,
      jobName: jobs.name,
      clientName: jobs.clientName,
      assignedAt: jobTechnicians.assignedAt,
    })
      .from(jobTechnicians)
      .innerJoin(jobs, eq(jobTechnicians.jobId, jobs.id))
      .where(and(
        eq(jobs.userId, userId),
        inArray(jobTechnicians.technicianId, techIds),
        eq(jobs.status, 'active'),
      ))
      .orderBy(desc(jobTechnicians.assignedAt)),
  ])

  // jobs MTD per tech (jobs started this month OR created this month)
  const jobsMtdByTech = new Map<string, Set<string>>()
  for (const a of assignments) {
    const refDate = a.jobStart ?? a.jobCreated
    if (!refDate || refDate < firstOfMonth) continue
    if (!jobsMtdByTech.has(a.technicianId)) jobsMtdByTech.set(a.technicianId, new Set())
    jobsMtdByTech.get(a.technicianId)!.add(a.jobId)
  }

  // Map jobId → set of techIds (for revenue attribution per tech)
  const jobToTechs = new Map<string, string[]>()
  for (const a of assignments) {
    const arr = jobToTechs.get(a.jobId) ?? []
    arr.push(a.technicianId)
    jobToTechs.set(a.jobId, arr)
  }

  // Revenue MTD per employee: sum of paid-this-month invoice totals for jobs they're assigned to,
  // split equally when multiple techs on the same job.
  const revenueByTech = new Map<string, number>()
  for (const inv of monthInvoices) {
    if (!inv.jobId) continue
    const techsOnJob = jobToTechs.get(inv.jobId) ?? []
    if (techsOnJob.length === 0) continue
    const share = parseFloat(inv.total) / techsOnJob.length
    for (const tid of techsOnJob) {
      revenueByTech.set(tid, (revenueByTech.get(tid) ?? 0) + share)
    }
  }

  // Paid out MTD per subcontractor (labor + subcontractor expenses linked to them)
  const paidOutByTech = new Map<string, number>()
  for (const e of monthExpenses) {
    if (!e.technicianId) continue
    if (e.type !== 'labor' && e.type !== 'subcontractor') continue
    paidOutByTech.set(e.technicianId, (paidOutByTech.get(e.technicianId) ?? 0) + parseFloat(e.amount))
  }

  // Active job context (take the most recent active assignment per tech)
  const activeJobByTech = new Map<string, { jobId: string; jobName: string; clientName: string }>()
  for (const row of activeJobRows) {
    if (activeJobByTech.has(row.technicianId)) continue // keep first (already ordered desc)
    activeJobByTech.set(row.technicianId, { jobId: row.jobId, jobName: row.jobName, clientName: row.clientName })
  }

  return techs.map(t => ({
    ...t,
    jobsMtd: jobsMtdByTech.get(t.id)?.size ?? 0,
    revenueMtd: revenueByTech.get(t.id) ?? 0,
    paidOutMtd: paidOutByTech.get(t.id) ?? 0,
    activeJobContext: activeJobByTech.get(t.id) ?? null,
  }))
}

type CreateTechInput = {
  name: string; email: string; phone: string; hourlyRate: string
  type?: TechnicianType; role?: string; tier?: string
  rating?: string; availabilityStatus?: TechnicianAvailability | null; availabilityNote?: string
}

export async function createTechnician(data: CreateTechInput) {
  const userId = await requireAuth()

  // Prevent duplicate techs con el mismo email (mismo pattern que createClient).
  const emailNorm = data.email?.trim().toLowerCase()
  if (emailNorm) {
    const existing = await dbAdapter.technicians.findAll(userId)
    const dupe = existing.find(t => (t.email ?? '').toLowerCase() === emailNorm)
    if (dupe) throw new Error(`DUPLICATE_TECHNICIAN: "${dupe.name}" already exists with this email.`)
  }

  const t = await dbAdapter.technicians.create(userId, {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    hourlyRate: data.hourlyRate || null,
    type: data.type ?? 'employee',
    role: data.role || null,
    tier: data.tier || null,
    rating: data.rating || null,
    availabilityStatus: data.availabilityStatus ?? null,
    availabilityNote: data.availabilityNote || null,
  })
  revalidatePath('/[locale]/team', 'page')
  return t
}

type UpdateTechInput = Partial<CreateTechInput>

export async function updateTechnician(id: string, data: UpdateTechInput) {
  const userId = await requireAuth()
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.email !== undefined) patch.email = data.email
  if (data.phone !== undefined) patch.phone = data.phone || null
  if (data.hourlyRate !== undefined) patch.hourlyRate = data.hourlyRate || null
  if (data.type !== undefined) patch.type = data.type
  if (data.role !== undefined) patch.role = data.role || null
  if (data.tier !== undefined) patch.tier = data.tier || null
  if (data.rating !== undefined) patch.rating = data.rating || null
  if (data.availabilityStatus !== undefined) patch.availabilityStatus = data.availabilityStatus ?? null
  if (data.availabilityNote !== undefined) patch.availabilityNote = data.availabilityNote || null
  const t = await dbAdapter.technicians.update(id, userId, patch)
  revalidatePath('/[locale]/team', 'page')
  return t
}

export async function deleteTechnician(id: string) {
  const userId = await requireAuth()
  await dbAdapter.technicians.delete(id, userId)
  revalidatePath('/[locale]/team', 'page')
}

/**
 * Check-only: detecta conflictos de schedule sin escribir nada.
 * Devuelve warning si tech ya está en otros jobs active/lead (priorizando mismo día).
 */
export async function checkTechnicianAssignmentConflict(jobId: string, technicianId: string): Promise<{ warning?: string }> {
  const userId = await requireAuth()
  const [job, techJobs, allJobs] = await Promise.all([
    dbAdapter.jobs.findById(jobId, userId),
    dbAdapter.technicians.findJobsByTechnician(technicianId),
    dbAdapter.jobs.findAll(userId),
  ])

  const techActiveJobs = allJobs.filter(j =>
    j.id !== jobId &&
    techJobs.includes(j.id) &&
    (j.status === 'active' || j.status === 'lead')
  )
  if (techActiveJobs.length === 0) return {}

  const toDateKey = (d: Date) => `${new Date(d).getFullYear()}-${String(new Date(d).getMonth()+1).padStart(2,'0')}-${String(new Date(d).getDate()).padStart(2,'0')}`
  let conflicts = techActiveJobs
  if (job?.startDate) {
    const jobDateKey = toDateKey(new Date(job.startDate))
    const sameDayConflicts = techActiveJobs.filter(j => j.startDate && toDateKey(new Date(j.startDate)) === jobDateKey)
    if (sameDayConflicts.length > 0) conflicts = sameDayConflicts
  }
  if (conflicts.length === 0) return {}

  const tech = await dbAdapter.technicians.findById(technicianId, userId)
  const conflictNames = conflicts.slice(0, 3).map(c => c.name).join(', ')
  const sameDayNote = job?.startDate ? ' on the same day' : ''
  return { warning: `${tech?.name || 'Technician'} is already assigned to "${conflictNames}"${sameDayNote}.` }
}

export async function assignTechnicianToJob(jobId: string, technicianId: string): Promise<{ success: boolean; warning?: string }> {
  const userId = await requireAuth()

  // Ownership check: job debe pertenecer al user.
  const job = await dbAdapter.jobs.findById(jobId, userId)
  if (!job) throw new Error('Job not found or not authorized')

  // Check conflict SIN escribir. Si UI quiere confirmación previa, usa checkTechnicianAssignmentConflict.
  const { warning } = await checkTechnicianAssignmentConflict(jobId, technicianId)

  await dbAdapter.technicians.assignToJob(jobId, technicianId)
  revalidatePath('/[locale]/projects/[id]', 'page')
  revalidatePath('/[locale]/schedule', 'page')
  return { success: true, warning }
}

export async function removeTechnicianFromJob(jobId: string, technicianId: string) {
  const userId = await requireAuth()
  // Ownership check: job debe pertenecer al user. Previene que un user A remueva
  // técnicos del job de un user B vía API directa.
  const job = await dbAdapter.jobs.findById(jobId, userId)
  if (!job) throw new Error('Job not found or not authorized')
  await dbAdapter.technicians.removeFromJob(jobId, technicianId)
  revalidatePath('/[locale]/projects/[id]', 'page')
}

export async function getTechniciansByJob(jobId: string) {
  await requireAuth()
  return dbAdapter.technicians.findByJob(jobId)
}

export async function getAllJobAssignments() {
  const userId = await requireAuth()
  return dbAdapter.technicians.findAllJobAssignments(userId)
}
