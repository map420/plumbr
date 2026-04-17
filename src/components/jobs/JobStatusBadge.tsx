import { JobStatus } from '@/lib/store/jobs'

const badgeClass: Record<JobStatus, string> = {
  lead: 'badge-lead',
  active: 'badge-active',
  on_hold: 'badge-on-hold',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

export function JobStatusBadge({ status, label }: { status: JobStatus; label: string }) {
  return (
    <span className={`badge badge-sm ${badgeClass[status] || 'badge-draft'}`}>
      {label}
    </span>
  )
}
