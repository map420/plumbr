import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/actions/clients'
import { getCurrentUserProfile } from '@/lib/actions/profile'
import { parseTaxPercent } from '@/lib/tax'
import { NewInvoiceClient } from '../_components/NewInvoiceClient'

export default async function NewInvoicePage() {
  const [ti, tc, te, clients, profile] = await Promise.all([
    getTranslations('invoices'),
    getTranslations('common'),
    getTranslations('estimates'),
    getClients(),
    getCurrentUserProfile(),
  ])
  const taxPercent = parseTaxPercent(profile?.taxRate)
  return (
    <div className="md:p-8 max-w-3xl">
      <h1 className="hidden md:block page-title">{ti('new')}</h1>
      <NewInvoiceClient
        clients={clients}
        taxPercent={taxPercent}
        translations={{
          save: tc('save'),
          cancel: tc('cancel'),
          fields: {
            clientName: ti('fields.clientName'),
            clientEmail: ti('fields.clientEmail'),
            dueDate: ti('fields.dueDate'),
            notes: ti('fields.notes'),
            subtotal: ti('fields.subtotal'),
            tax: ti('fields.tax'),
            total: ti('fields.total'),
          },
          lineItems: {
            title: te('lineItems.title'),
            add: te('lineItems.add'),
            type: {
              labor: te('lineItems.type.labor'),
              material: te('lineItems.type.material'),
              subcontractor: te('lineItems.type.subcontractor'),
              other: te('lineItems.type.other'),
            },
          },
        }}
      />
    </div>
  )
}
