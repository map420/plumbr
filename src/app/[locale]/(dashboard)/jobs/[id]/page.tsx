import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/actions/jobs'
import { getEstimatesByJob } from '@/lib/actions/estimates'
import { getInvoicesByJob } from '@/lib/actions/invoices'
import { getExpensesByJob } from '@/lib/actions/expenses'
import { getTechnicians, getTechniciansByJob } from '@/lib/actions/technicians'
import { JobDetailClient } from '../_components/JobDetailClient'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [tj, tc, te, ti, job, estimates, invoices, expenses, allTechnicians, assignedTechnicians] = await Promise.all([
    getTranslations('jobs'), getTranslations('common'), getTranslations('estimates'), getTranslations('invoices'),
    getJob(id), getEstimatesByJob(id), getInvoicesByJob(id), getExpensesByJob(id),
    getTechnicians(), getTechniciansByJob(id),
  ])
  if (!job) notFound()

  return (
    <JobDetailClient
      job={job} estimates={estimates} invoices={invoices} expenses={expenses}
      allTechnicians={allTechnicians} assignedTechnicians={assignedTechnicians}
      translations={{
        edit: tc('edit'), back: tc('back'), delete: tc('delete'),
        fields: { address: tj('fields.address'), clientEmail: tj('fields.clientEmail'), clientPhone: tj('fields.clientPhone'), startDate: tj('fields.startDate'), endDate: tj('fields.endDate'), budgetedCost: tj('fields.budgetedCost'), actualCost: tj('fields.actualCost'), notes: tj('fields.notes') },
        status: { lead: tj('status.lead'), active: tj('status.active'), on_hold: tj('status.on_hold'), completed: tj('status.completed'), cancelled: tj('status.cancelled') },
        estimates: te('title'), invoices: ti('title'), newEstimate: te('new'), newInvoice: ti('new'),
        estimateStatus: { draft: te('status.draft'), sent: te('status.sent'), approved: te('status.approved'), rejected: te('status.rejected'), converted: te('status.converted') },
        invoiceStatus: { draft: ti('status.draft'), sent: ti('status.sent'), paid: ti('status.paid'), overdue: ti('status.overdue'), cancelled: ti('status.cancelled') },
      }}
    />
  )
}
