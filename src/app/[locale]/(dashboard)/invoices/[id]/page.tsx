import { getTranslations } from 'next-intl/server'
import { InvoiceDetailClient } from '../_components/InvoiceDetailClient'

export default async function InvoiceDetailPage() {
  const ti = await getTranslations('invoices')
  const tc = await getTranslations('common')
  const te = await getTranslations('estimates')
  return (
    <InvoiceDetailClient
      translations={{
        back: tc('back'), markAsPaid: ti('markAsPaid'),
        status: {
          draft: ti('status.draft'), sent: ti('status.sent'), paid: ti('status.paid'),
          overdue: ti('status.overdue'), cancelled: ti('status.cancelled'),
        },
        fields: {
          clientName: ti('fields.clientName'), clientEmail: ti('fields.clientEmail'),
          dueDate: ti('fields.dueDate'), notes: ti('fields.notes'),
          subtotal: ti('fields.subtotal'), tax: ti('fields.tax'), total: ti('fields.total'),
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
        print: 'Print',
      }}
    />
  )
}
