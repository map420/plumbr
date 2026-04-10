import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getInvoice, getInvoiceLineItems } from '@/lib/actions/invoices'
import { InvoiceDetailClient } from '../_components/InvoiceDetailClient'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [ti, tc, te, invoice, lineItems] = await Promise.all([
    getTranslations('invoices'), getTranslations('common'), getTranslations('estimates'),
    getInvoice(id), getInvoiceLineItems(id),
  ])
  if (!invoice) notFound()

  return (
    <InvoiceDetailClient
      invoice={invoice} lineItems={lineItems}
      translations={{
        back: tc('back'), markAsPaid: ti('markAsPaid'), print: 'Print',
        status: { draft: ti('status.draft'), sent: ti('status.sent'), paid: ti('status.paid'), overdue: ti('status.overdue'), cancelled: ti('status.cancelled') },
        fields: { clientName: ti('fields.clientName'), clientEmail: ti('fields.clientEmail'), dueDate: ti('fields.dueDate'), notes: ti('fields.notes'), subtotal: ti('fields.subtotal'), tax: ti('fields.tax'), total: ti('fields.total') },
        lineItems: {
          type: { labor: te('lineItems.type.labor'), material: te('lineItems.type.material'), subcontractor: te('lineItems.type.subcontractor'), other: te('lineItems.type.other') },
          fields: { description: te('lineItems.fields.description'), quantity: te('lineItems.fields.quantity'), unitPrice: te('lineItems.fields.unitPrice'), total: te('lineItems.fields.total') },
        },
      }}
    />
  )
}
