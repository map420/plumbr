import { notFound } from 'next/navigation'
import { getInvoice, getInvoiceLineItems } from '@/lib/actions/invoices'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { generateQR } from '@/lib/qr'
import { PrintControls } from './_components/PrintButton'

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await requireUser()
  const [invoice, lineItems, user] = await Promise.all([
    getInvoice(id),
    getInvoiceLineItems(id),
    dbAdapter.users.findById(userId),
  ])
  if (!invoice) notFound()

  const portalUrl = invoice.shareToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://workpilot.mrlabs.io'}/en/portal/${invoice.shareToken}` : null
  const qrDataUrl = portalUrl ? await generateQR(portalUrl) : null

  const companyName = user?.companyName || 'WorkPilot'
  const companyPhone = user?.phone || ''
  const companyEmail = user?.email || ''

  return (
    <div className="bg-white min-h-screen">
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
            <h1 className="text-3xl font-bold text-[#1E3A5F]">{companyName}</h1>
            {companyPhone && <p className="text-slate-500 text-sm mt-1">{companyPhone}</p>}
            {companyEmail && <p className="text-slate-500 text-sm">{companyEmail}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Invoice</p>
            <h2 className="text-2xl font-bold text-slate-800">{invoice.number}</h2>
            <p className="text-slate-500 text-sm mt-1">
              Issued: {new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {invoice.dueDate && (
              <p className="text-slate-500 text-sm">
                Due: {new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 p-4 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Bill To</p>
          <p className="font-semibold text-slate-800 text-base">{invoice.clientName}</p>
          {invoice.clientEmail && <p className="text-slate-600 text-sm">{invoice.clientEmail}</p>}
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-[#1E3A5F]">
              <th className="text-left py-2.5 font-semibold text-slate-700 pr-4">Description</th>
              <th className="text-center py-2.5 font-semibold text-slate-700 w-16">Qty</th>
              <th className="text-right py-2.5 font-semibold text-slate-700 w-28">Unit Price</th>
              <th className="text-right py-2.5 font-semibold text-slate-700 w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => (
              <tr key={li.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="py-2.5 pr-4 text-slate-700">{li.description}</td>
                <td className="py-2.5 text-center text-slate-500">{li.quantity}</td>
                <td className="py-2.5 text-right text-slate-500">${parseFloat(li.unitPrice).toFixed(2)}</td>
                <td className="py-2.5 text-right font-medium text-slate-800">${parseFloat(li.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto max-w-xs">
          <div className="space-y-1.5 text-sm border-t border-slate-200 pt-3">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>${parseFloat(invoice.tax).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold text-[#1E3A5F] pt-3 mt-2 border-t-2 border-[#1E3A5F]">
            <span>Total Due</span>
            <span>${parseFloat(invoice.total).toFixed(2)}</span>
          </div>
          {invoice.paidAt && (
            <div className="mt-2 text-center">
              <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                PAID · {new Date(invoice.paidAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-4 border-t border-slate-200 text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* QR Code */}
        {qrDataUrl && (
          <div className="mt-8 flex items-center gap-3 border-t border-slate-200 pt-4">
            <img src={qrDataUrl} alt="Pay online" className="w-24 h-24" />
            <div>
              <p className="text-xs font-medium text-slate-600">Pay online</p>
              <p className="text-xs text-slate-400">Scan this QR code to view and pay this invoice online.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 text-center">
          Thank you for your business · {companyName}
        </div>
      </div>

    </div>
  )
}
