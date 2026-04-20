import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getInvoice, getInvoiceLineItems } from '@/lib/actions/invoices'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { generateQR } from '@/lib/qr'
import { PrintControls } from './_components/PrintButton'

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const userId = await requireUser()
  const [invoice, lineItems, user, tc, tp] = await Promise.all([
    getInvoice(id),
    getInvoiceLineItems(id),
    dbAdapter.users.findById(userId),
    getTranslations('print.common'),
    getTranslations('print.invoice'),
  ])
  if (!invoice) notFound()

  const portalUrl = invoice.shareToken
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://workpilot.mrlabs.io'}/${locale === 'es' ? 'es' : 'en'}/portal/${invoice.shareToken}`
    : null
  const qrDataUrl = portalUrl ? await generateQR(portalUrl) : null

  const companyName = user?.companyName || 'WorkPilot'
  const companyPhone = user?.phone || ''
  const companyEmail = user?.email || ''

  return (
    <div className="bg-card min-h-screen">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Print controls — hidden when printing */}
      <PrintControls />

      <div className="max-w-2xl mx-auto px-12 py-10 print:px-0 print:py-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-3xl font-bold text-navy-500">{companyName}</h1>
            {companyPhone && <p className="text-muted-foreground text-sm mt-1">{companyPhone}</p>}
            {companyEmail && <p className="text-muted-foreground text-sm">{companyEmail}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground mb-1">{tp('label')}</p>
            <h2 className="text-2xl font-bold text-foreground">{invoice.number}</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {tp('issued')}: {new Date(invoice.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {invoice.dueDate && (
              <p className="text-muted-foreground text-sm">
                {tp('due')}: {new Date(invoice.dueDate).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 p-4 bg-muted rounded-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-subtle-foreground mb-2">{tp('billTo')}</p>
          <p className="font-semibold text-foreground text-base">{invoice.clientName}</p>
          {invoice.clientEmail && <p className="text-muted-foreground text-sm">{invoice.clientEmail}</p>}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-navy-500">
              <th className="text-left py-2.5 font-semibold text-foreground pr-4">{tc('description')}</th>
              <th className="text-center py-2.5 font-semibold text-foreground w-16">{tc('qty')}</th>
              <th className="text-right py-2.5 font-semibold text-foreground w-28">{tc('unitPrice')}</th>
              <th className="text-right py-2.5 font-semibold text-foreground w-24">{tc('total')}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={li.id} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/50'}>
                <td className="py-2.5 pr-4 text-foreground">{li.description}</td>
                <td className="py-2.5 text-center text-muted-foreground">{li.quantity}</td>
                <td className="py-2.5 text-right text-muted-foreground">${parseFloat(li.unitPrice).toFixed(2)}</td>
                <td className="py-2.5 text-right font-medium text-foreground">${parseFloat(li.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto max-w-xs">
          <div className="space-y-1.5 text-sm border-t border-border pt-3">
            <div className="flex justify-between text-muted-foreground">
              <span>{tc('subtotal')}</span>
              <span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{tc('tax')}</span>
              <span>${parseFloat(invoice.tax).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold text-navy-500 pt-3 mt-2 border-t-2 border-navy-500">
            <span>{tp('totalDue')}</span>
            <span>${parseFloat(invoice.total).toFixed(2)}</span>
          </div>
          {invoice.paidAt && (
            <div className="mt-2 text-center">
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                {tp('paid')} · {new Date(invoice.paidAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-4 border-t border-border text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{tp('notes')}</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* QR Code */}
        {qrDataUrl && (
          <div className="mt-8 flex items-center gap-3 border-t border-border pt-4">
            <img src={qrDataUrl} alt="Pay online" className="w-24 h-24" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">{tp('payOnline')}</p>
              <p className="text-xs text-subtle-foreground">{tp('payQrDesc')}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-xs text-subtle-foreground text-center">
          {tc('thankYou')} · {companyName}
        </div>
      </div>

    </div>
  )
}
