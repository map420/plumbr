/**
 * Shared helpers for determining which jobs are "scheduled today".
 *
 * Three places consume this concept (dashboard, field, schedule). Before this
 * module each had its own filter — dashboard used UTC midnight boundaries,
 * field used local date comparison, and schedule included 'lead' jobs while
 * the other two didn't. This module unifies them.
 *
 * Canonical rule:
 * - status is 'active' or 'lead' (a lead with a scheduled date should still show)
 * - startDate falls on today in the local timezone (not UTC midnight — the
 *   contractor thinks in their own timezone)
 */

const SCHEDULED_STATUSES = new Set(['active', 'lead'])

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isScheduledToday(job: { status: string; startDate: Date | null }): boolean {
  if (!SCHEDULED_STATUSES.has(job.status)) return false
  if (!job.startDate) return false
  return isSameLocalDay(new Date(job.startDate), new Date())
}
