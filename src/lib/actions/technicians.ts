'use server'
import { requireUser as requireAuth } from './auth-helpers'


import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'


export async function getTechnicians() {
  const userId = await requireAuth()
  return dbAdapter.technicians.findAll(userId)
}

export async function createTechnician(data: { name: string; email: string; phone: string; hourlyRate: string }) {
  const userId = await requireAuth()
  const t = await dbAdapter.technicians.create(userId, {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    hourlyRate: data.hourlyRate || null,
  })
  revalidatePath('/[locale]/team', 'page')
  return t
}

export async function updateTechnician(id: string, data: Partial<{ name: string; email: string; phone: string; hourlyRate: string }>) {
  const userId = await requireAuth()
  const t = await dbAdapter.technicians.update(id, userId, {
    ...data.name !== undefined && { name: data.name },
    ...data.email !== undefined && { email: data.email },
    ...data.phone !== undefined && { phone: data.phone || null },
    ...data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate || null },
  })
  revalidatePath('/[locale]/team', 'page')
  return t
}

export async function deleteTechnician(id: string) {
  const userId = await requireAuth()
  await dbAdapter.technicians.delete(id, userId)
  revalidatePath('/[locale]/team', 'page')
}

export async function assignTechnicianToJob(jobId: string, technicianId: string): Promise<{ success: boolean; warning?: string }> {
  const userId = await requireAuth()

  // Conflict detection: warn if technician is already assigned to other active jobs
  const job = await dbAdapter.jobs.findById(jobId, userId)
  const techJobs = await dbAdapter.technicians.findJobsByTechnician(technicianId)
  const allJobs = await dbAdapter.jobs.findAll(userId)

  // Find other active jobs this tech is assigned to
  const techActiveJobs = allJobs.filter(j =>
    j.id !== jobId &&
    techJobs.includes(j.id) &&
    (j.status === 'active' || j.status === 'lead')
  )

  if (techActiveJobs.length > 0) {
    // If both jobs have dates, check same-day conflict
    const toDateKey = (d: Date) => `${new Date(d).getFullYear()}-${String(new Date(d).getMonth()+1).padStart(2,'0')}-${String(new Date(d).getDate()).padStart(2,'0')}`

    let conflicts = techActiveJobs
    if (job?.startDate) {
      const jobDateKey = toDateKey(new Date(job.startDate))
      const sameDayConflicts = techActiveJobs.filter(j => j.startDate && toDateKey(new Date(j.startDate)) === jobDateKey)
      if (sameDayConflicts.length > 0) conflicts = sameDayConflicts
    }

    if (conflicts.length > 0) {
      const tech = await dbAdapter.technicians.findById(technicianId, userId)
      const conflictNames = conflicts.slice(0, 3).map(c => c.name).join(', ')
      await dbAdapter.technicians.assignToJob(jobId, technicianId)
      revalidatePath('/[locale]/jobs/[id]', 'page')
      revalidatePath('/[locale]/schedule', 'page')
      const sameDayNote = job?.startDate ? ' on the same day' : ''
      return { success: true, warning: `${tech?.name || 'Technician'} is already assigned to "${conflictNames}"${sameDayNote}.` }
    }
  }

  await dbAdapter.technicians.assignToJob(jobId, technicianId)
  revalidatePath('/[locale]/jobs/[id]', 'page')
  revalidatePath('/[locale]/schedule', 'page')
  return { success: true }
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

export async function getAllJobAssignments() {
  const userId = await requireAuth()
  return dbAdapter.technicians.findAllJobAssignments(userId)
}
