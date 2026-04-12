'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createEstimate } from '@/lib/actions/estimates'
import { getJobs } from '@/lib/actions/jobs'
import { createInvoice } from '@/lib/actions/invoices'
import { updateEstimate } from '@/lib/actions/estimates'
import { Plus, Trash2, Search, X } from 'lucide-react'

type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type LI = { type: LineItemType; description: string; quantity: number; unitPrice: number; total: number }
type Job = { id: string; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; clientId: string | null }
type Estimate = { id: string; jobId: string | null; clientName: string; clientEmail: string | null; notes: string | null; validUntil: Date | null }
type T = { save: string; cancel: string; convertToInvoice?: string; job?: string; fields: Record<string, string>; lineItems: { title: string; add: string; type: Record<LineItemType, string>; fields: Record<string, string> } }

const TEMPLATES: Record<string, LI[]> = {
  'Electrical install': [
    { type: 'labor', description: 'Electrician labor (8h)', quantity: 8, unitPrice: 75, total: 600 },
    { type: 'material', description: 'Wiring & conduit', quantity: 1, unitPrice: 220, total: 220 },
  ],
  'Plumbing repair': [
    { type: 'labor', description: 'Plumber labor (4h)', quantity: 4, unitPrice: 85, total: 340 },
    { type: 'material', description: 'Pipes & fittings', quantity: 1, unitPrice: 120, total: 120 },
  ],
  'Drywall patch': [
    { type: 'labor', description: 'Drywall labor (3h)', quantity: 3, unitPrice: 60, total: 180 },
    { type: 'material', description: 'Drywall materials', quantity: 1, unitPrice: 80, total: 80 },
  ],
}

function calcTotals(items: LI[]) {
  const subtotal = items.reduce((s, li) => s + li.total, 0)
  const tax = Math.round(subtotal * 0.1 * 100) / 100
  return { subtotal, tax, total: subtotal + tax }
}

export function EstimateFormClient({ translations: t, estimate }: { translations: T; estimate?: Estimate }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState(estimate?.jobId ?? searchParams.get('jobId') ?? '')
  const [jobSearch, setJobSearch] = useState('')
  const [showJobDropdown, setShowJobDropdown] = useState(false)
  const jobDropdownRef = useRef<HTMLDivElement>(null)
  const [clientName, setClientName] = useState(estimate?.clientName ?? '')
  const [clientEmail, setClientEmail] = useState(estimate?.clientEmail ?? '')
  const [clientPhone, setClientPhone] = useState('')
  const [validUntil, setValidUntil] = useState(estimate?.validUntil ? new Date(estimate.validUntil).toISOString().split('T')[0] : '')
  const [notes, setNotes] = useState(estimate?.notes ?? '')
  const [items, setItems] = useState<LI[]>([])

  useEffect(() => {
    getJobs().then(loadedJobs => {
      setJobs(loadedJobs)
      // Pre-fill job search label if editing or pre-selected via URL
      const preId = estimate?.jobId ?? searchParams.get('jobId') ?? ''
      if (preId) {
        const found = loadedJobs.find(j => j.id === preId)
        if (found) {
          setJobSearch(found.name)
          setClientName(found.clientName)
          setClientEmail(found.clientEmail ?? '')
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) setShowJobDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectJob(job: Job) {
    setJobId(job.id)
    setJobSearch(job.name)
    setClientName(job.clientName)
    setClientEmail(job.clientEmail ?? '')
    setClientPhone(job.clientPhone ?? '')
    setShowJobDropdown(false)
  }

  function clearJob() {
    setJobId('')
    setJobSearch('')
    setClientName('')
    setClientEmail('')
    setClientPhone('')
  }

  const filteredJobs = jobs.filter(j =>
    j.name.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.clientName.toLowerCase().includes(jobSearch.toLowerCase())
  )

  const { subtotal, tax, total } = calcTotals(items)

  function updateItem(i: number, field: string, value: string | number) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[i].total = Math.round(updated[i].quantity * updated[i].unitPrice * 100) / 100
    }
    setItems(updated)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!estimate && items.length === 0) { setFormError('Add at least one line item.'); return }
    startTransition(async () => {
      const selectedJob = jobs.find(j => j.id === jobId)
      const clientId = selectedJob?.clientId ?? ''
      const data = { jobId, clientId, clientName, clientEmail, clientPhone, status: 'draft', subtotal, tax, total, notes, validUntil: validUntil ? new Date(validUntil).toISOString() : '' }
      if (estimate) {
        await updateEstimate(estimate.id, { notes, status: 'draft' })
        router.push(`/${locale}/estimates/${estimate.id}`)
      } else {
        const created = await createEstimate(data, items)
        router.push(`/${locale}/estimates/${created.id}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
      )}
      <div className="plumbr-card p-5 space-y-4">
        <div ref={jobDropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.job ?? 'Job'}
            <span className="ml-2 text-xs font-normal text-slate-400">
              {jobId ? '— linked to job' : '— optional'}
            </span>
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={jobSearch}
              onChange={e => { setJobSearch(e.target.value); setShowJobDropdown(true); if (!e.target.value) clearJob() }}
              onFocus={() => { if (!jobId) setShowJobDropdown(true) }}
              placeholder="Search jobs..."
              readOnly={!!jobId}
              className={`w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${jobId ? 'border-[#1E3A5F]/40 bg-blue-50 text-[#1E3A5F] font-medium cursor-default' : 'border-slate-200'}`}
            />
            {jobId && (
              <button type="button" onClick={clearJob} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          {showJobDropdown && !jobId && filteredJobs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredJobs.map(j => (
                <button key={j.id} type="button" onClick={() => selectJob(j)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{j.name}</p>
                  <p className="text-xs text-slate-400">{j.clientName}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientName}</label>
            <input required value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientEmail}</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Phone</label>
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="(555) 000-0000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.validUntil}</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
      </div>

      <div className="plumbr-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{t.lineItems.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Templates:</span>
            {Object.keys(TEMPLATES).map((name) => (
              <button key={name} type="button" onClick={() => setItems(TEMPLATES[name])} className="text-xs px-2 py-1 rounded border border-[#F97316]/40 text-[#F97316] hover:bg-orange-50">{name}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2 mb-4">
          {items.length > 0 && (
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
              <div className="col-span-2">Type</div><div className="col-span-5">{t.lineItems.fields.description}</div>
              <div className="col-span-1 text-center">{t.lineItems.fields.quantity}</div>
              <div className="col-span-2 text-right">{t.lineItems.fields.unitPrice}</div>
              <div className="col-span-1 text-right">{t.lineItems.fields.total}</div><div className="col-span-1" />
            </div>
          )}
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2">
                <select value={item.type} onChange={(e) => updateItem(i, 'type', e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                  {(Object.keys(t.lineItems.type) as LineItemType[]).map((type) => <option key={type} value={type}>{t.lineItems.type[type]}</option>)}
                </select>
              </div>
              <div className="col-span-5"><input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" /></div>
              <div className="col-span-1"><input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" /></div>
              <div className="col-span-2"><input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none" /></div>
              <div className="col-span-1 text-right text-xs font-medium text-slate-700">${item.total.toFixed(2)}</div>
              <div className="col-span-1 text-right"><button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button></div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setItems([...items, { type: 'labor', description: '', quantity: 1, unitPrice: 0, total: 0 }])} className="flex items-center gap-1 text-sm text-[#F97316] hover:text-orange-600 font-medium">
          <Plus size={15} /> {t.lineItems.add}
        </button>
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600"><span>{t.fields.subtotal}</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-slate-600"><span>{t.fields.tax} (10%)</span><span>${tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>{t.fields.total}</span><span>${total.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="plumbr-card p-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.notes}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
