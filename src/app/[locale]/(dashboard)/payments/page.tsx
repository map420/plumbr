import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { PaymentsClient } from './_components/PaymentsClient'

export default async function PaymentsPage() {
  const userId = await requireUser()
  const [invoices, estimates] = await Promise.all([
    dbAdapter.invoices.findAll(userId),
    dbAdapter.estimates.findAll(userId),
  ])

  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const dueInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const ytdRevenue = paidInvoices
    .filter(i => i.paidAt && new Date(i.paidAt) >= yearStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)
  const monthRevenue = paidInvoices
    .filter(i => i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)
  const monthInvoiceVolume = invoices
    .filter(i => new Date(i.createdAt) >= monthStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)

  const sentEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'approved' || e.status === 'rejected' || e.status === 'converted')
  const approvedEstimates = estimates.filter(e => e.status === 'approved' || e.status === 'converted')
  const winRate = sentEstimates.length > 0 ? Math.round((approvedEstimates.length / sentEstimates.length) * 100) : 0

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <PaymentsClient
        dueInvoices={dueInvoices.map(i => ({
          id: i.id, number: i.number, clientName: i.clientName,
          total: i.total, status: i.status, dueDate: i.dueDate?.toISOString() || null,
          createdAt: i.createdAt.toISOString(),
        }))}
        ytdRevenue={ytdRevenue}
        monthRevenue={monthRevenue}
        winRate={winRate}
        monthInvoiceVolume={monthInvoiceVolume}
        monthName={now.toLocaleDateString('en-US', { month: 'long' })}
      />
    </div>
  )
}
