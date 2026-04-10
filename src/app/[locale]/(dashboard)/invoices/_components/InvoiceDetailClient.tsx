'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvoice, getInvoiceLineItems, updateInvoice, isOverdue, Invoice, InvoiceStatus } from '@/lib/store/invoices'
import { LineItem, LineItemType } from '@/lib/store/estimates'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { ArrowLeft, Printer } from 'lucide-react'

type T = {
  back: string; markAsPaid: string; print: string
  status: Record<InvoiceStatus, string>
  fields: Record<string, string>
  lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> }
}

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

export function InvoiceDetailClient({ translations: t }: { translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  function load() {
    const inv = getInvoice(id)
    if (!inv) { router.push(`/${locale}/invoices`); return }
    const effective = { ...inv, status: isOverdue(inv) ? 'overdue' as InvoiceStatus : inv.status }
    setInvoice(effective)
    setLineItems(getInvoiceLineItems(id))
  }

  useEffect(() => { load() }, [id, locale, router])

  if (!invoice) return null

  function handleMarkPaid() {
    updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() })
    load()
  }

  function handleStatusChange(status: InvoiceStatus) {
    updateInvoice(id, { status })
    load()
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/${locale}/invoices`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft size={14} /> {t.back}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{invoice.number}</h1>
          <div className="mt-1">
            <InvoiceStatusBadge status={invoice.status} label={t.status[invoice.status]} />
          </div>
        </div>
        <div className="flex gap-2">
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button onClick={handleMarkPaid} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
              {t.markAsPaid}
            </button>
          )}
          <Link href={`/${locale}/invoices/${id}/print`} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14} /> {t.print}
          </Link>
        </div>
      </div>

      {/* Status changer */}
      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500 mr-1">Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${invoice.status === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {t.status[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Client info */}
      <div className="plumbr-card p-5 mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-500">{t.fields.clientName}</span>
          <p className="font-medium mt-0.5">{invoice.clientName}</p>
        </div>
        <div>
          <span className="text-slate-500">{t.fields.clientEmail}</span>
          <p className="font-medium mt-0.5">{invoice.clientEmail || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">{t.fields.dueDate}</span>
          <p className="font-medium mt-0.5">
            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
          </p>
        </div>
        {invoice.paidAt && (
          <div>
            <span className="text-slate-500">Paid At</span>
            <p className="font-medium mt-0.5 text-green-600">{new Date(invoice.paidAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="plumbr-card p-5 mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 font-medium text-slate-500">Type</th>
              <th className="text-left py-2 font-medium text-slate-500">{t.lineItems.fields.description}</th>
              <th className="text-center py-2 font-medium text-slate-500">{t.lineItems.fields.quantity}</th>
              <th className="text-right py-2 font-medium text-slate-500">{t.lineItems.fields.unitPrice}</th>
              <th className="text-right py-2 font-medium text-slate-500">{t.lineItems.fields.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lineItems.map((li) => (
              <tr key={li.id}>
                <td className="py-2.5 pr-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{t.lineItems.type[li.type]}</span>
                </td>
                <td className="py-2.5">{li.description}</td>
                <td className="py-2.5 text-center text-slate-600">{li.quantity}</td>
                <td className="py-2.5 text-right text-slate-600">${li.unitPrice.toFixed(2)}</td>
                <td className="py-2.5 text-right font-medium">${li.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm ml-auto max-w-xs">
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.subtotal}</span><span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.tax}</span><span>${invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1">
            <span>{t.fields.total}</span><span>${invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="plumbr-card p-4 text-sm">
          <span className="text-slate-500">{t.fields.notes}</span>
          <p className="mt-1 text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
