import { notFound } from 'next/navigation'
import { getInvoice, getInvoiceLineItems } from '@/lib/actions/invoices'
import { PrintButton } from './_components/PrintButton'

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [invoice, lineItems] = await Promise.all([getInvoice(id), getInvoiceLineItems(id)])
  if (!invoice) notFound()

  return (
    <div className="max-w-2xl mx-auto p-12 bg-white min-h-screen print:p-8">
      <style>{`@media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } }`}</style>
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[#1E3A5F]">Plumbr</h1>
          <p className="text-slate-400 text-sm mt-1">Your construction business, straight.</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-slate-800">INVOICE</h2>
          <p className="text-slate-500 text-sm">{invoice.number}</p>
          <p className="text-slate-500 text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div>
          <p className="text-slate-400 uppercase text-xs font-medium mb-1">Bill To</p>
          <p className="font-semibold text-slate-800">{invoice.clientName}</p>
          {invoice.clientEmail && <p className="text-slate-600">{invoice.clientEmail}</p>}
        </div>
        <div className="text-right">
          {invoice.dueDate && (
            <>
              <p className="text-slate-400 uppercase text-xs font-medium mb-1">Due Date</p>
              <p className="font-semibold text-slate-800">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </>
          )}
        </div>
      </div>

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 font-semibold text-slate-600">Description</th>
            <th className="text-center py-2 font-semibold text-slate-600">Qty</th>
            <th className="text-right py-2 font-semibold text-slate-600">Unit Price</th>
            <th className="text-right py-2 font-semibold text-slate-600">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((li) => (
            <tr key={li.id} className="border-b border-slate-100">
              <td className="py-2.5">{li.description}</td>
              <td className="py-2.5 text-center text-slate-500">{li.quantity}</td>
              <td className="py-2.5 text-right text-slate-500">${parseFloat(li.unitPrice).toFixed(2)}</td>
              <td className="py-2.5 text-right font-medium">${parseFloat(li.total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto max-w-xs text-sm space-y-1">
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${parseFloat(invoice.subtotal).toFixed(2)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Tax</span><span>${parseFloat(invoice.tax).toFixed(2)}</span></div>
        <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300"><span>Total</span><span>${parseFloat(invoice.total).toFixed(2)}</span></div>
      </div>

      <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center">
        Thank you for your business · Plumbr · Built by Mr Labs
      </div>

      <PrintButton />
    </div>
  )
}
