import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/actions/clients'
import { getCurrentUserProfile } from '@/lib/actions/profile'
import { parseTaxPercent } from '@/lib/tax'
import { EstimateFormClient } from '../_components/EstimateFormClient'

export default async function NewEstimatePage() {
  const [te, tc, tj, clients, profile] = await Promise.all([
    getTranslations('estimates'),
    getTranslations('common'),
    getTranslations('jobs'),
    getClients(),
    getCurrentUserProfile(),
  ])
  const taxPercent = parseTaxPercent(profile?.taxRate)
  return (
    <div className="md:p-8 max-w-3xl">
      <h1 className="hidden md:block page-title">{te('new')}</h1>
      <EstimateFormClient
        clients={clients}
        taxPercent={taxPercent}
        translations={{
          save: tc('save'), cancel: tc('cancel'),
          fields: {
            clientName: te('fields.clientName'), clientEmail: te('fields.clientEmail'),
            validUntil: te('fields.validUntil'), notes: te('fields.notes'),
            subtotal: te('fields.subtotal'), tax: te('fields.tax'), total: te('fields.total'),
          },
          lineItems: {
            title: te('lineItems.title'), add: te('lineItems.add'),
            type: {
              labor: te('lineItems.type.labor'), material: te('lineItems.type.material'),
              subcontractor: te('lineItems.type.subcontractor'), other: te('lineItems.type.other'),
            },
            fields: {
              description: te('lineItems.fields.description'), quantity: te('lineItems.fields.quantity'),
              unitPrice: te('lineItems.fields.unitPrice'), total: te('lineItems.fields.total'),
            },
          },
          job: tj('title'),
          convertToInvoice: te('convertToInvoice'),
        }}
      />
    </div>
  )
}
