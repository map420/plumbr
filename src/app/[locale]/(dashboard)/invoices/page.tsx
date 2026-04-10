import { getTranslations } from 'next-intl/server'
import { getInvoices } from '@/lib/actions/invoices'
import { InvoicesClient } from './_components/InvoicesClient'

export default async function InvoicesPage() {
  const [t, invoices] = await Promise.all([getTranslations('invoices'), getInvoices()])
  return (
    <InvoicesClient
      initialInvoices={invoices}
      translations={{
        title: t('title'), new: t('new'), empty: t('empty'), markAsPaid: t('markAsPaid'),
        status: { draft: t('status.draft'), sent: t('status.sent'), paid: t('status.paid'), overdue: t('status.overdue'), cancelled: t('status.cancelled') },
        fields: { number: t('fields.number'), clientName: t('fields.clientName'), dueDate: t('fields.dueDate'), total: t('fields.total') },
      }}
    />
  )
}
