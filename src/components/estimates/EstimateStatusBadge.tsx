import { EstimateStatus } from '@/lib/store/estimates'

const styles: Record<EstimateStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  converted: 'bg-purple-100 text-purple-700',
}

export function EstimateStatusBadge({ status, label }: { status: EstimateStatus; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {label}
    </span>
  )
}
