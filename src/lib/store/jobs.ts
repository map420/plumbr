import { getAll, saveAll } from '.'

const KEY = 'plumbr_jobs'

export type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface Job {
  id: string
  name: string
  clientName: string
  clientEmail: string
  clientPhone: string
  address: string
  status: JobStatus
  budgetedCost: number
  actualCost: number
  startDate: string
  endDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export function getJobs(): Job[] {
  return getAll<Job>(KEY).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getJob(id: string): Job | undefined {
  return getAll<Job>(KEY).find((j) => j.id === id)
}

export function createJob(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Job {
  const jobs = getAll<Job>(KEY)
  const job: Job = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveAll(KEY, [...jobs, job])
  return job
}

export function updateJob(id: string, data: Partial<Omit<Job, 'id' | 'createdAt'>>): Job {
  const jobs = getAll<Job>(KEY)
  const index = jobs.findIndex((j) => j.id === id)
  if (index === -1) throw new Error('Job not found')
  jobs[index] = { ...jobs[index], ...data, updatedAt: new Date().toISOString() }
  saveAll(KEY, jobs)
  return jobs[index]
}

export function deleteJob(id: string): void {
  const jobs = getAll<Job>(KEY).filter((j) => j.id !== id)
  saveAll(KEY, jobs)
}
