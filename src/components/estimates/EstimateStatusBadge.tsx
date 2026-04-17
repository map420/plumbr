import { EstimateStatus } from '@/lib/store/estimates'

const badgeClass: Record<EstimateStatus, string> = {
  draft: 'badge-draft',
  sent: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  converted: 'badge-converted',
  expired: 'badge-expired',
}

export function EstimateStatusBadge({ status, label }: { status: EstimateStatus; label: string }) {
  return (
    <span className={`badge badge-sm ${badgeClass[status] || 'badge-draft'}`}>
      {label}
    </span>
  )
}
