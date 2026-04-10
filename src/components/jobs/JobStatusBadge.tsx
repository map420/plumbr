import { JobStatus } from '@/lib/store/jobs'

const styles: Record<JobStatus, string> = {
  lead: 'bg-slate-100 text-slate-600',
  active: 'bg-blue-100 text-blue-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export function JobStatusBadge({ status, label }: { status: JobStatus; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  )
}
