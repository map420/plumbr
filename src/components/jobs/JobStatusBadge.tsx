import { JobStatus } from '@/lib/store/jobs'

// Extended with derived 'scheduled' badge (active + future startDate)
type BadgeStatus = JobStatus | 'scheduled'

const badgeClass: Record<BadgeStatus, string> = {
  lead: 'badge-lead',
  active: 'badge-active',
  on_hold: 'badge-on-hold',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  scheduled: 'badge-scheduled',
}

export function JobStatusBadge({ status, label }: { status: BadgeStatus; label: string }) {
  return (
    <span className={`badge badge-sm ${badgeClass[status] || 'badge-draft'}`}>
      {label}
    </span>
  )
}
