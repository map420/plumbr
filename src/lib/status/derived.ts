/**
 * Derived UI statuses — compute from date fields without DB migration.
 * The underlying column remains the source of truth; these helpers give UI
 * the richer picture (Expired / Scheduled / Inactive / days-overdue).
 */

export type EstimateDbStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
export type EstimateUiStatus = EstimateDbStatus | 'expired'

export type JobDbStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type JobUiStatus = JobDbStatus | 'scheduled'

/**
 * Estimate is "expired" when: sent + allowExpire + validUntil has passed.
 * Approved/converted/rejected estimates stay in their final state — expiration only
 * applies while awaiting client response.
 */
export function deriveEstimateStatus(
  e: { status: string; validUntil?: Date | string | null; allowExpire?: boolean | null },
  now: Date = new Date(),
): EstimateUiStatus {
  const status = e.status as EstimateDbStatus
  if (status !== 'sent') return status
  if (e.allowExpire === false) return status
  if (!e.validUntil) return status
  const validUntil = typeof e.validUntil === 'string' ? new Date(e.validUntil) : e.validUntil
  return validUntil < now ? 'expired' : status
}

/**
 * Job is "scheduled" when: active + startDate is in the future.
 * Leads with startDate stay as 'lead' (they're not confirmed yet).
 */
export function deriveJobStatus(
  j: { status: string; startDate?: Date | string | null },
  now: Date = new Date(),
): JobUiStatus {
  const status = j.status as JobDbStatus
  if (status !== 'active') return status
  if (!j.startDate) return status
  const startDate = typeof j.startDate === 'string' ? new Date(j.startDate) : j.startDate
  return startDate > now ? 'scheduled' : status
}

/**
 * Client inactive if their most recent activity timestamp is older than `thresholdDays`.
 * Null/undefined lastActivityAt → considered inactive (never touched).
 */
export function isInactiveClient(
  lastActivityAt: Date | string | null | undefined,
  now: Date = new Date(),
  thresholdDays = 60,
): boolean {
  if (!lastActivityAt) return true
  const d = typeof lastActivityAt === 'string' ? new Date(lastActivityAt) : lastActivityAt
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= thresholdDays
}

/**
 * Count of whole days between today and a due date (overdue = positive).
 * Returns 0 when due date is null/undefined or still in the future.
 */
export function daysOverdue(dueDate: Date | string | null | undefined, now: Date = new Date()): number {
  if (!dueDate) return 0
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  if (d >= now) return 0
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Invoice effective status — mirrors the inline logic in InvoiceDetailClient.
 * Use wherever a counter or filter needs today-aware overdue detection.
 */
export type InvoiceDbStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export function deriveInvoiceStatus(
  inv: { status: string; dueDate: Date | string | null; paidAt: Date | string | null },
  now: Date = new Date(),
): InvoiceDbStatus {
  const status = inv.status as InvoiceDbStatus
  if (status === 'paid' || status === 'cancelled' || status === 'draft') return status
  if (!inv.paidAt && inv.dueDate) {
    const d = typeof inv.dueDate === 'string' ? new Date(inv.dueDate) : inv.dueDate
    if (d < now) return 'overdue'
  }
  return status
}
