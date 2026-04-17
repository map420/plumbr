/**
 * StatusPill — v2 status indicator with colored dot + label.
 * Replaces the loose mix of .badge-* classes with a typed component.
 *
 * Status values align with domain models:
 *   estimate: draft | sent | approved | rejected | converted | expired
 *   invoice:  draft | sent | partial | paid | overdue
 *   job:      lead  | scheduled | active | done | cancelled
 */
import { cn } from '@/lib/utils'

export type StatusTone =
  | 'sent' | 'pending' | 'active' | 'info'
  | 'approved' | 'paid' | 'done' | 'success'
  | 'rejected' | 'declined' | 'overdue' | 'danger'
  | 'warning' | 'partial'
  | 'converted' | 'invoiced'
  | 'draft' | 'neutral'

export interface StatusPillProps {
  tone: StatusTone
  /** Label shown in the pill. Defaults to a capitalized version of `tone`. */
  children?: React.ReactNode
  /** Hide the colored dot. */
  hideDot?: boolean
  className?: string
}

const TONE_CLASS: Record<StatusTone, string> = {
  sent: 'wp-pill--sent',
  pending: 'wp-pill--pending',
  active: 'wp-pill--active',
  info: 'wp-pill--info',
  approved: 'wp-pill--approved',
  paid: 'wp-pill--paid',
  done: 'wp-pill--done',
  success: 'wp-pill--success',
  rejected: 'wp-pill--rejected',
  declined: 'wp-pill--declined',
  overdue: 'wp-pill--overdue',
  danger: 'wp-pill--danger',
  warning: 'wp-pill--warning',
  partial: 'wp-pill--partial',
  converted: 'wp-pill--converted',
  invoiced: 'wp-pill--invoiced',
  draft: 'wp-pill--draft',
  neutral: 'wp-pill--neutral',
}

export function StatusPill({ tone, children, hideDot, className }: StatusPillProps) {
  const label = children ?? tone.charAt(0).toUpperCase() + tone.slice(1)
  return (
    <span className={cn('wp-pill', TONE_CLASS[tone], className)}>
      {!hideDot && <span className="wp-pill-dot" aria-hidden="true" />}
      {label}
    </span>
  )
}
