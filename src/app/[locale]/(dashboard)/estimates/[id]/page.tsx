import { getTranslations } from 'next-intl/server'
import { EstimateDetailClient } from '../_components/EstimateDetailClient'

export default async function EstimateDetailPage() {
  const te = await getTranslations('estimates')
  const tc = await getTranslations('common')
  return (
    <EstimateDetailClient
      translations={{
        back: tc('back'), edit: tc('edit'), delete: tc('delete'),
        convertToInvoice: te('convertToInvoice'),
        status: {
          draft: te('status.draft'), sent: te('status.sent'), approved: te('status.approved'),
          rejected: te('status.rejected'), converted: te('status.converted'),
        },
        fields: {
          clientName: te('fields.clientName'), clientEmail: te('fields.clientEmail'),
          validUntil: te('fields.validUntil'), notes: te('fields.notes'),
          subtotal: te('fields.subtotal'), tax: te('fields.tax'), total: te('fields.total'),
        },
        lineItems: {
          type: {
            labor: te('lineItems.type.labor'), material: te('lineItems.type.material'),
            subcontractor: te('lineItems.type.subcontractor'), other: te('lineItems.type.other'),
          },
          fields: {
            description: te('lineItems.fields.description'), quantity: te('lineItems.fields.quantity'),
            unitPrice: te('lineItems.fields.unitPrice'), total: te('lineItems.fields.total'),
          },
        },
      }}
    />
  )
}
