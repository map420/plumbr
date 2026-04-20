/**
 * Shared predicate for "which jobs belong on date X" — keeps Schedule,
 * Field and Dashboard consistent. Excludes completed/cancelled jobs
 * (they shouldn't appear on a live calendar).
 */

type ScheduleJob = {
  id: string
  status: string
  startDate: Date | string | null
  endDate?: Date | string | null
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function isJobActiveOnDate(job: ScheduleJob, date: Date): boolean {
  if (!job.startDate) return false
  if (job.status === 'completed' || job.status === 'cancelled') return false
  const start = typeof job.startDate === 'string' ? new Date(job.startDate) : job.startDate
  const startDay = new Date(start); startDay.setHours(0, 0, 0, 0)
  if (job.endDate) {
    const end = typeof job.endDate === 'string' ? new Date(job.endDate) : job.endDate
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 999)
    return date >= startDay && date <= endDay
  }
  return sameDay(startDay, date)
}

export function getJobsForDate<T extends ScheduleJob>(jobs: T[], date: Date): T[] {
  return jobs.filter(j => isJobActiveOnDate(j, date))
}

export function getJobsForToday<T extends ScheduleJob>(jobs: T[]): T[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return getJobsForDate(jobs, today)
}
