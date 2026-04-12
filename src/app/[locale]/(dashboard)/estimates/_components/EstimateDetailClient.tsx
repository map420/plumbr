'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteEstimate, updateEstimate } from '@/lib/actions/estimates'
import { createInvoice } from '@/lib/actions/invoices'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Edit, Trash2, ArrowRight, Loader2, Briefcase } from 'lucide-react'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Estimate = { id: string; number: string; jobId: string | null; clientName: string; clientEmail: string | null; status: string; subtotal: string; tax: string; total: string; validUntil: Date | null; notes: string | null }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; edit: string; delete: string; convertToInvoice: string; status: Record<EstimateStatus, string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

export function EstimateDetailClient({ estimate, lineItems, job, translations: t }: { estimate: Estimate; lineItems: LineItem[]; job: { id: string; name: string } | null; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [isConverting, setIsConverting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  function handleDelete() {
    startTransition(async () => { await deleteEstimate(estimate.id); router.push(`/${locale}/estimates`) })
  }

  function handleStatusChange(status: EstimateStatus) {
    startTransition(async () => { await updateEstimate(estimate.id, { status }); router.refresh() })
  }

  function handleConvert() {
    if (!confirm('Convert this estimate to an invoice?')) return
    setIsConverting(true)
    startTransition(async () => {
      try {
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)
        const invoice = await createInvoice(
          { jobId: estimate.jobId ?? '', estimateId: estimate.id, clientName: estimate.clientName, clientEmail: estimate.clientEmail ?? '', status: 'draft', subtotal: parseFloat(estimate.subtotal), tax: parseFloat(estimate.tax), total: parseFloat(estimate.total), dueDate: dueDate.toISOString(), notes: estimate.notes ?? '' },
          lineItems.map((li) => ({ type: li.type, description: li.description, quantity: parseFloat(li.quantity), unitPrice: parseFloat(li.unitPrice), total: parseFloat(li.total) }))
        )
        await updateEstimate(estimate.id, { status: 'converted', convertedToInvoiceId: invoice.id })
        router.push(`/${locale}/invoices/${invoice.id}`)
      } finally {
        setIsConverting(false)
      }
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Estimate"
          message={`Are you sure you want to delete ${estimate.number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Breadcrumbs items={[{ label: 'Estimates', href: `/${locale}/estimates` }, { label: estimate.number }]} />
          <h1 className="text-2xl font-bold text-slate-900">{estimate.number}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <EstimateStatusBadge status={estimate.status as EstimateStatus} label={t.status[estimate.status as EstimateStatus]} />
            {job && (
              <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#1E3A5F] transition-colors">
                <Briefcase size={11} />{job.name} →
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {estimate.status !== 'converted' && (
            <button onClick={handleConvert} disabled={isPending || isConverting} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 min-w-[140px] justify-center">
              {isConverting ? <><Loader2 size={14} className="animate-spin" /> Converting...</> : <><ArrowRight size={14} /> {t.convertToInvoice}</>}
            </button>
          )}
          <Link href={`/${locale}/estimates/${estimate.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm"><Edit size={14} /> {t.edit}</Link>
          <button onClick={() => setShowDeleteModal(true)} disabled={isPending} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14} /> {t.delete}</button>
        </div>
      </div>

      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500 mr-1">Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)} disabled={isPending}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-50 ${estimate.status === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.status[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="plumbr-card p-5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div><span className="text-slate-500">{t.fields.clientName}</span><p className="font-medium mt-0.5">{estimate.clientName}</p></div>
        <div><span className="text-slate-500">{t.fields.clientEmail}</span><p className="font-medium mt-0.5">{estimate.clientEmail || '—'}</p></div>
        <div><span className="text-slate-500">{t.fields.validUntil}</span><p className="font-medium mt-0.5">{estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString() : '—'}</p></div>
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
          <div className="flex justify-between text-slate-600"><span>{t.fields.subtotal}</span><span>${parseFloat(estimate.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>{t.fields.tax}</span><span>${parseFloat(estimate.tax).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>{t.fields.total}</span><span>${parseFloat(estimate.total).toFixed(2)}</span></div>
        </div>
      </div>

      {estimate.notes && <div className="plumbr-card p-4 text-sm"><span className="text-slate-500">{t.fields.notes}</span><p className="mt-1 text-slate-700 whitespace-pre-wrap">{estimate.notes}</p></div>}
    </div>
  )
}
