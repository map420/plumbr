import { InvoiceStatus } from '@/lib/store/invoices'

const badgeClass: Record<InvoiceStatus, string> = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  paid: 'badge-paid',
  overdue: 'badge-overdue',
  cancelled: 'badge-draft',
}

export function InvoiceStatusBadge({ status, label }: { status: InvoiceStatus; label: string }) {
  return (
    <span className={`badge badge-sm ${badgeClass[status] || 'badge-draft'}`}>
      {label}
    </span>
  )
}
