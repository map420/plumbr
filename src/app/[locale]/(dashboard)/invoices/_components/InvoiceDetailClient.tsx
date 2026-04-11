'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateInvoice, sendInvoiceToClient } from '@/lib/actions/invoices'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Toast } from '@/components/Toast'
import { Printer, Send, Loader2 } from 'lucide-react'

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
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const status = effectiveStatus(invoice)

  function handleSend() {
    setIsSending(true)
    startTransition(async () => {
      const result = await sendInvoiceToClient(invoice.id)
      setIsSending(false)
      if (result.sent) {
        setToast(`Invoice sent to ${invoice.clientEmail}`)
        router.refresh()
      } else {
        setToast(result.error ?? 'Could not send email.')
      }
    })
  }

  function handleStatusChange(newStatus: InvoiceStatus) {
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid' && !invoice.paidAt) update.paidAt = new Date().toISOString()
    startTransition(async () => { await updateInvoice(invoice.id, update); router.refresh() })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Breadcrumbs items={[{ label: 'Invoices', href: `/${locale}/invoices` }, { label: invoice.number }]} />
          <h1 className="text-2xl font-bold text-slate-900">{invoice.number}</h1>
          <div className="mt-1"><InvoiceStatusBadge status={status} label={t.status[status]} /></div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {(status === 'draft' || status === 'sent' || status === 'overdue') && invoice.clientEmail && (
            <button onClick={handleSend} disabled={isPending || isSending}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[#1E3A5F] text-white hover:bg-[#16304f] transition-colors disabled:opacity-50">
              {isSending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send to Client</>}
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
