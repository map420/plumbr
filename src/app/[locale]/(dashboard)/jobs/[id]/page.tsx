import { getTranslations } from 'next-intl/server'
import { JobDetailClient } from '../_components/JobDetailClient'

export default async function JobDetailPage() {
  const tj = await getTranslations('jobs')
  const tc = await getTranslations('common')
  const te = await getTranslations('estimates')
  const ti = await getTranslations('invoices')

  return (
    <JobDetailClient
      translations={{
        edit: tc('edit'),
        back: tc('back'),
        delete: tc('delete'),
        fields: {
          address: tj('fields.address'),
          clientEmail: tj('fields.clientEmail'),
          clientPhone: tj('fields.clientPhone'),
          startDate: tj('fields.startDate'),
          endDate: tj('fields.endDate'),
          budgetedCost: tj('fields.budgetedCost'),
          actualCost: tj('fields.actualCost'),
          notes: tj('fields.notes'),
        },
        status: {
          lead: tj('status.lead'),
          active: tj('status.active'),
          on_hold: tj('status.on_hold'),
          completed: tj('status.completed'),
          cancelled: tj('status.cancelled'),
        },
        estimates: te('title'),
        invoices: ti('title'),
        newEstimate: te('new'),
        newInvoice: ti('new'),
        estimateStatus: {
          draft: te('status.draft'),
          sent: te('status.sent'),
          approved: te('status.approved'),
          rejected: te('status.rejected'),
          converted: te('status.converted'),
        },
        invoiceStatus: {
          draft: ti('status.draft'),
          sent: ti('status.sent'),
          paid: ti('status.paid'),
          overdue: ti('status.overdue'),
          cancelled: ti('status.cancelled'),
        },
      }}
    />
  )
}
