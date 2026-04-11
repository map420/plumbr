'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateInvoice, createInvoicePaymentLink } from '@/lib/actions/invoices'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { ArrowLeft, Printer, LinkIcon } from 'lucide-react'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Invoice = { id: string; number: string; clientName: string; clientEmail: string | null; status: string; subtotal: string; tax: string; total: string; dueDate: Date | null; paidAt: Date | null; notes: string | null }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; markAsPaid: string; print: string; status: Record<InvoiceStatus, string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
  return inv.status as InvoiceStatus
}

export function InvoiceDetailClient({ invoice, lineItems, translations: t }: { invoice: Invoice; lineItems: LineItem[]; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const status = effectiveStatus(invoice)

  function handlePaymentLink() {
    setGeneratingLink(true)
    startTransition(async () => {
      const { url } = await createInvoicePaymentLink(invoice.id)
      setPaymentUrl(url)
      setGeneratingLink(false)
      router.refresh()
    })
  }

  function handleStatusChange(newStatus: InvoiceStatus) {
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid' && !invoice.paidAt) update.paidAt = new Date().toISOString()
    startTransition(async () => { await updateInvoice(invoice.id, update); router.refresh() })
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/${locale}/invoices`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"><ArrowLeft size={14} /> {t.back}</Link>
          <h1 className="text-2xl font-bold text-slate-900">{invoice.number}</h1>
          <div className="mt-1"><InvoiceStatusBadge status={status} label={t.status[status]} /></div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {status !== 'paid' && status !== 'cancelled' && (
            <button onClick={handlePaymentLink} disabled={isPending || generatingLink}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              <LinkIcon size={14} /> {generatingLink ? 'Generating...' : 'Send Payment Link'}
            </button>
          )}
          {(status === 'sent' || status === 'overdue') && (
            <button onClick={() => handleStatusChange('paid')} disabled={isPending}
              className="text-sm px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50">
              {t.markAsPaid}
            </button>
          )}
          <Link href={`/${locale}/invoices/${invoice.id}/print`} className="btn-secondary flex items-center gap-2 text-sm"><Printer size={14} /> {t.print}</Link>
        </div>
      </div>

      {paymentUrl && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-green-800">Payment link generated</p>
            <p className="text-xs text-green-600 mt-0.5 truncate max-w-md">{paymentUrl}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigator.clipboard.writeText(paymentUrl)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
              Copy Link
            </button>
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-colors">
              Open
            </a>
          </div>
        </div>
      )}

      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500 mr-1">Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)} disabled={isPending}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50 ${status === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.status[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="plumbr-card p-5 mb-4 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-slate-500">{t.fields.clientName}</span><p className="font-medium mt-0.5">{invoice.clientName}</p></div>
        <div><span className="text-slate-500">{t.fields.clientEmail}</span><p className="font-medium mt-0.5">{invoice.clientEmail || '—'}</p></div>
        <div><span className="text-slate-500">{t.fields.dueDate}</span><p className="font-medium mt-0.5">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</p></div>
        {invoice.paidAt && <div><span className="text-slate-500">Paid</span><p className="font-medium mt-0.5 text-green-600">{new Date(invoice.paidAt).toLocaleDateString()}</p></div>}
      </div>

      <div className="plumbr-card p-5 mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200">
            <th className="text-left py-2 font-medium text-slate-500">Type</th>
            <th className="text-left py-2 font-medium text-slate-500">{t.lineItems.fields.description}</th>
            <th className="text-center py-2 font-medium text-slate-500">{t.lineItems.fields.quantity}</th>
            <th className="text-right py-2 font-medium text-slate-500">{t.lineItems.fields.unitPrice}</th>
            <th className="text-right py-2 font-medium text-slate-500">{t.lineItems.fields.total}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {lineItems.map((li) => (
              <tr key={li.id}>
                <td className="py-2.5 pr-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{t.lineItems.type[li.type as LineItemType]}</span></td>
                <td className="py-2.5">{li.description}</td>
                <td className="py-2.5 text-center text-slate-600">{li.quantity}</td>
                <td className="py-2.5 text-right text-slate-600">${parseFloat(li.unitPrice).toFixed(2)}</td>
                <td className="py-2.5 text-right font-medium">${parseFloat(li.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm ml-auto max-w-xs">
          <div className="flex justify-between text-slate-600"><span>{t.fields.subtotal}</span><span>${parseFloat(invoice.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>{t.fields.tax}</span><span>${parseFloat(invoice.tax).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>{t.fields.total}</span><span>${parseFloat(invoice.total).toFixed(2)}</span></div>
        </div>
      </div>

      {invoice.notes && <div className="plumbr-card p-4 text-sm"><span className="text-slate-500">{t.fields.notes}</span><p className="mt-1 text-slate-700 whitespace-pre-wrap">{invoice.notes}</p></div>}
    </div>
  )
}
