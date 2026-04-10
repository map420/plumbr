'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getEstimate, getLineItems, deleteEstimate, updateEstimate, Estimate, EstimateStatus, LineItem, LineItemType } from '@/lib/store/estimates'
import { createInvoice } from '@/lib/store/invoices'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { ArrowLeft, Edit, Trash2, ArrowRight } from 'lucide-react'

type T = {
  back: string; edit: string; delete: string; convertToInvoice: string
  status: Record<EstimateStatus, string>
  fields: Record<string, string>
  lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> }
}

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

export function EstimateDetailClient({ translations: t }: { translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string

  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])

  useEffect(() => {
    const e = getEstimate(id)
    if (!e) { router.push(`/${locale}/estimates`); return }
    setEstimate(e)
    setLineItems(getLineItems(id))
  }, [id, locale, router])

  if (!estimate) return null

  function handleDelete() {
    if (!confirm('Delete this estimate?')) return
    deleteEstimate(id)
    router.push(`/${locale}/estimates`)
  }

  function handleStatusChange(status: EstimateStatus) {
    const updated = updateEstimate(id, { status })
    setEstimate(updated)
  }

  function handleConvert() {
    if (!confirm('Convert this estimate to an invoice?')) return
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const invoice = createInvoice(
      {
        jobId: estimate!.jobId, estimateId: estimate!.id,
        clientName: estimate!.clientName, clientEmail: estimate!.clientEmail,
        status: 'draft', subtotal: estimate!.subtotal, tax: estimate!.tax, total: estimate!.total,
        dueDate: dueDate.toISOString(), paidAt: '', notes: estimate!.notes,
      },
      lineItems.map(({ id: _id, parentId: _p, ...rest }) => rest)
    )
    updateEstimate(id, { status: 'converted', convertedToInvoiceId: invoice.id })
    router.push(`/${locale}/invoices/${invoice.id}`)
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/${locale}/estimates`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft size={14} /> {t.back}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{estimate.number}</h1>
          <div className="mt-1">
            <EstimateStatusBadge status={estimate.status} label={t.status[estimate.status]} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {estimate.status !== 'converted' && (
            <button onClick={handleConvert} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <ArrowRight size={14} /> {t.convertToInvoice}
            </button>
          )}
          <Link href={`/${locale}/estimates/${id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit size={14} /> {t.edit}
          </Link>
          <button onClick={handleDelete} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={14} /> {t.delete}
          </button>
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
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${estimate.status === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
          <p className="font-medium mt-0.5">{estimate.clientName}</p>
        </div>
        <div>
          <span className="text-slate-500">{t.fields.clientEmail}</span>
          <p className="font-medium mt-0.5">{estimate.clientEmail || '—'}</p>
        </div>
        <div>
          <span className="text-slate-500">{t.fields.validUntil}</span>
          <p className="font-medium mt-0.5">
            {estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString() : '—'}
          </p>
        </div>
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
            <span>{t.fields.subtotal}</span><span>${estimate.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.tax}</span><span>${estimate.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1">
            <span>{t.fields.total}</span><span>${estimate.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {estimate.notes && (
        <div className="plumbr-card p-4 text-sm">
          <span className="text-slate-500">{t.fields.notes}</span>
          <p className="mt-1 text-slate-700 whitespace-pre-wrap">{estimate.notes}</p>
        </div>
      )}
    </div>
  )
}
