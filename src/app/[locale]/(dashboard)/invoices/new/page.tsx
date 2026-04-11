import { getTranslations } from 'next-intl/server'
import { NewInvoiceClient } from '../_components/NewInvoiceClient'

export default async function NewInvoicePage() {
  const ti = await getTranslations('invoices')
  const tc = await getTranslations('common')
  return (
    <div className="p-4 md:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{ti('new')}</h1>
      <NewInvoiceClient translations={{ save: tc('save'), cancel: tc('cancel'), fields: { clientName: ti('fields.clientName'), clientEmail: ti('fields.clientEmail'), dueDate: ti('fields.dueDate'), notes: ti('fields.notes') } }} />
    </div>
  )
}
