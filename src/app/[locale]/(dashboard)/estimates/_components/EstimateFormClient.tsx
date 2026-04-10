'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createEstimate, LineItem, LineItemType, Estimate, saveLineItems } from '@/lib/store/estimates'
import { updateEstimate, getEstimate, getLineItems } from '@/lib/store/estimates'
import { getJobs, Job } from '@/lib/store/jobs'
import { createInvoice } from '@/lib/store/invoices'
import { Plus, Trash2 } from 'lucide-react'

type LI = Omit<LineItem, 'id' | 'parentId'>
type T = {
  save: string; cancel: string; convertToInvoice?: string; job?: string
  fields: Record<string, string>
  lineItems: { title: string; add: string; type: Record<LineItemType, string>; fields: Record<string, string> }
}

const TEMPLATES: Record<string, LI[]> = {
  'Electrical install': [
    { type: 'labor', description: 'Electrician labor (8h)', quantity: 8, unitPrice: 75, total: 600, sortOrder: 0 },
    { type: 'material', description: 'Wiring & conduit', quantity: 1, unitPrice: 220, total: 220, sortOrder: 1 },
  ],
  'Plumbing repair': [
    { type: 'labor', description: 'Plumber labor (4h)', quantity: 4, unitPrice: 85, total: 340, sortOrder: 0 },
    { type: 'material', description: 'Pipes & fittings', quantity: 1, unitPrice: 120, total: 120, sortOrder: 1 },
  ],
  'Drywall patch': [
    { type: 'labor', description: 'Drywall labor (3h)', quantity: 3, unitPrice: 60, total: 180, sortOrder: 0 },
    { type: 'material', description: 'Drywall materials', quantity: 1, unitPrice: 80, total: 80, sortOrder: 1 },
  ],
}

function calcTotals(items: LI[]) {
  const subtotal = items.reduce((sum, li) => sum + li.total, 0)
  const tax = Math.round(subtotal * 0.1 * 100) / 100
  return { subtotal, tax, total: subtotal + tax }
}

export function EstimateFormClient({ translations: t, estimate }: { translations: T; estimate?: Estimate }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const preselectedJobId = searchParams.get('jobId') ?? ''

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState(preselectedJobId)
  const [clientName, setClientName] = useState(estimate?.clientName ?? '')
  const [clientEmail, setClientEmail] = useState(estimate?.clientEmail ?? '')
  const [validUntil, setValidUntil] = useState(estimate?.validUntil ? estimate.validUntil.split('T')[0] : '')
  const [notes, setNotes] = useState(estimate?.notes ?? '')
  const [items, setItems] = useState<LI[]>(
    estimate ? getLineItems(estimate.id).map(({ id: _id, parentId: _p, ...rest }) => rest) : []
  )

  useEffect(() => { setJobs(getJobs()) }, [])

  // Auto-fill client name from job
  useEffect(() => {
    if (jobId) {
      const job = jobs.find((j) => j.id === jobId)
      if (job && !clientName) {
        setClientName(job.clientName)
        setClientEmail(job.clientEmail)
      }
    }
  }, [jobId, jobs, clientName])

  const { subtotal, tax, total } = calcTotals(items)

  function addItem() {
    setItems([...items, { type: 'labor', description: '', quantity: 1, unitPrice: 0, total: 0, sortOrder: items.length }])
  }

  function applyTemplate(name: string) {
    setItems(TEMPLATES[name])
  }

  function updateItem(i: number, field: string, value: string | number) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[i].total = Math.round(updated[i].quantity * updated[i].unitPrice * 100) / 100
    }
    setItems(updated)
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = { jobId, clientName, clientEmail, status: 'draft' as const, subtotal, tax, total, notes, validUntil: validUntil ? new Date(validUntil).toISOString() : '', convertedToInvoiceId: '' }
    if (estimate) {
      updateEstimate(estimate.id, { ...data })
      saveLineItems(estimate.id, items)
      router.push(`/${locale}/estimates/${estimate.id}`)
    } else {
      const created = createEstimate(data, items)
      router.push(`/${locale}/estimates/${created.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="plumbr-card p-5 space-y-4">
        {/* Job selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.job ?? 'Job'}</label>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30">
            <option value="">— No job —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name} · {j.clientName}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientName}</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientEmail}</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.validUntil}</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
        </div>
      </div>

      {/* Line Items */}
      <div className="plumbr-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{t.lineItems.title}</h3>
          <div className="flex gap-2">
            {Object.keys(TEMPLATES).map((name) => (
              <button key={name} type="button" onClick={() => applyTemplate(name)} className="text-xs px-2 py-1 rounded border border-[#F97316]/40 text-[#F97316] hover:bg-orange-50 transition-colors">
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {/* Header */}
          {items.length > 0 && (
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
              <div className="col-span-2">Type</div>
              <div className="col-span-5">{t.lineItems.fields.description}</div>
              <div className="col-span-1 text-center">{t.lineItems.fields.quantity}</div>
              <div className="col-span-2 text-right">{t.lineItems.fields.unitPrice}</div>
              <div className="col-span-1 text-right">{t.lineItems.fields.total}</div>
              <div className="col-span-1" />
            </div>
          )}
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2">
                <select value={item.type} onChange={(e) => updateItem(i, 'type', e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                  {(Object.keys(t.lineItems.type) as LineItemType[]).map((type) => (
                    <option key={type} value={type}>{t.lineItems.type[type]}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-5">
                <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder={t.lineItems.fields.description} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
              </div>
              <div className="col-span-1">
                <input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" />
              </div>
              <div className="col-span-2">
                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none" />
              </div>
              <div className="col-span-1 text-right text-xs font-medium text-slate-700">${item.total.toFixed(2)}</div>
              <div className="col-span-1 text-right">
                <button type="button" onClick={() => removeItem(i)} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-[#F97316] hover:text-orange-600 font-medium">
          <Plus size={15} /> {t.lineItems.add}
        </button>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.subtotal}</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.tax} (10%)</span><span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1">
            <span>{t.fields.total}</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="plumbr-card p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.notes}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary text-sm">{t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
