'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createEstimate } from '@/lib/actions/estimates'
import { getJobs } from '@/lib/actions/jobs'
import { createInvoice } from '@/lib/actions/invoices'
import { updateEstimate } from '@/lib/actions/estimates'
import { getCatalogItems, createCatalogItem } from '@/lib/actions/catalog'
import { Plus, Trash2, Search, X, BookOpen, Save, Check, ChevronLeft, ChevronRight } from 'lucide-react'

type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type LI = {
  type: LineItemType; description: string; quantity: number; unitPrice: number
  total: number; markupPercent: number; section: string
}
type Job = { id: string; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; clientId: string | null }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type Estimate = { id: string; jobId: string | null; clientName: string; clientEmail: string | null; notes: string | null; validUntil: Date | null }
type CatalogItemType = { id: string; name: string; type: LineItemType; description: string | null; unitPrice: string; unit: string | null; category: string | null }
type T = { save: string; cancel: string; convertToInvoice?: string; job?: string; fields: Record<string, string>; lineItems: { title: string; add: string; type: Record<LineItemType, string>; fields: Record<string, string> } }

function calcTotals(items: LI[], discountType: string, discountValue: number, globalMarkup: number, taxDecimal: number) {
  let subtotal = 0
  for (const li of items) {
    const base = li.quantity * li.unitPrice
    const withMarkup = li.markupPercent > 0 ? base * (1 + li.markupPercent / 100) : base
    subtotal += withMarkup
  }
  if (globalMarkup > 0) subtotal = subtotal * (1 + globalMarkup / 100)
  let discount = 0
  if (discountType === 'percent') discount = subtotal * (discountValue / 100)
  else if (discountType === 'fixed') discount = discountValue
  const afterDiscount = Math.max(subtotal - discount, 0)
  const tax = Math.round(afterDiscount * taxDecimal * 100) / 100
  return { subtotal: Math.round(subtotal * 100) / 100, discount: Math.round(discount * 100) / 100, tax, total: Math.round((afterDiscount + tax) * 100) / 100 }
}

export function EstimateFormClient({ translations: t, estimate, clients = [], taxPercent = 0 }: { translations: T; estimate?: Estimate; clients?: Client[]; taxPercent?: number }) {
  const taxDecimal = taxPercent / 100
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [mobileStep, setMobileStep] = useState(0)
  const STEPS = ['Client', 'Work', 'Pricing', 'Payment', 'Delivery']
  const [formError, setFormError] = useState<string | null>(null)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState(estimate?.jobId ?? searchParams.get('jobId') ?? '')
  const [jobSearch, setJobSearch] = useState('')
  const [showJobDropdown, setShowJobDropdown] = useState(false)
  const jobDropdownRef = useRef<HTMLDivElement>(null)
  const [clientSearch, setClientSearch] = useState(estimate?.clientName ?? '')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [clientName, setClientName] = useState(estimate?.clientName ?? '')
  const [clientEmail, setClientEmail] = useState(estimate?.clientEmail ?? '')
  const [clientPhone, setClientPhone] = useState('')
  const [validUntil, setValidUntil] = useState(estimate?.validUntil ? new Date(estimate.validUntil).toISOString().split('T')[0] : '')
  const [notes, setNotes] = useState(estimate?.notes ?? '')
  const [items, setItems] = useState<LI[]>([])

  // Catalog
  const [catalogItems, setCatalogItems] = useState<CatalogItemType[]>([])
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const catalogRef = useRef<HTMLDivElement>(null)

  // Markup & Discount
  const [globalMarkup, setGlobalMarkup] = useState(0)
  const [discountType, setDiscountType] = useState('') // '' | 'percent' | 'fixed'
  const [discountValue, setDiscountValue] = useState(0)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showMarkup, setShowMarkup] = useState(false)

  // Deposit
  const [depositType, setDepositType] = useState('') // '' | 'percent' | 'fixed'
  const [depositAmount, setDepositAmount] = useState(0)
  const [showDeposit, setShowDeposit] = useState(false)

  // Auto-generate invoice
  const [autoInvoice, setAutoInvoice] = useState(false)
  const [requireSignature, setRequireSignature] = useState(true)

  useEffect(() => {
    getJobs().then(loadedJobs => {
      setJobs(loadedJobs)
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
    getCatalogItems().then(setCatalogItems).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) setShowJobDropdown(false)
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false)
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) setShowCatalog(false)
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
    setClientSearch(job.clientName)
    setSelectedClientId(job.clientId)
    setShowJobDropdown(false)
  }

  function clearJob() { setJobId(''); setJobSearch(''); setClientName(''); setClientEmail(''); setClientPhone(''); setClientSearch(''); setSelectedClientId(null) }

  function selectClient(client: Client) {
    setSelectedClientId(client.id)
    setClientName(client.name)
    setClientEmail(client.email ?? '')
    setClientPhone(client.phone ?? '')
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }

  function clearClient() { setSelectedClientId(null); setClientSearch(''); setClientName(''); setClientEmail(''); setClientPhone('') }

  function addFromCatalog(item: CatalogItemType) {
    setItems(prev => [...prev, {
      type: item.type,
      description: item.description || item.name,
      quantity: 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      total: parseFloat(item.unitPrice) || 0,
      markupPercent: 0,
      section: '',
    }])
    setShowCatalog(false)
    setCatalogSearch('')
  }

  async function saveItemToCatalog(item: LI) {
    const created = await createCatalogItem({
      name: item.description.slice(0, 255) || 'Unnamed item',
      type: item.type,
      description: item.description,
      unitPrice: String(item.unitPrice),
      unit: null,
      category: null,
    })
    setCatalogItems(prev => [...prev, created as unknown as CatalogItemType])
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  const filteredJobs = jobs.filter(j =>
    j.name.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.clientName.toLowerCase().includes(jobSearch.toLowerCase())
  )

  const filteredCatalog = catalogItems.filter(ci =>
    ci.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (ci.description ?? '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (ci.category ?? '').toLowerCase().includes(catalogSearch.toLowerCase())
  )

  const { subtotal, discount, tax, total } = calcTotals(items, discountType, discountValue, globalMarkup, taxDecimal)

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
      const clientId = selectedClientId ?? selectedJob?.clientId ?? ''
      const rawItems = items.map(li => ({
        ...li,
        markupPercent: li.markupPercent || undefined,
        section: li.section || undefined,
      }))
      const data = {
        jobId, clientId, clientName, clientEmail, clientPhone,
        status: 'draft', subtotal, tax, total, notes,
        validUntil: validUntil ? new Date(validUntil).toISOString() : '',
        markupPercent: globalMarkup || undefined,
        discountType: discountType || undefined,
        discountValue: discountValue || undefined,
        depositType: depositType || undefined,
        depositAmount: depositAmount || undefined,
        autoGenerateInvoice: autoInvoice,
      }
      if (estimate) {
        await updateEstimate(estimate.id, { notes, status: 'draft' })
        router.push(`/${locale}/estimates/${estimate.id}`)
      } else {
        const created = await createEstimate(data as any, rawItems as any)
        router.push(`/${locale}/estimates/${created.id}`)
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white md:bg-transparent min-h-full max-w-3xl">
      {/* Mobile header — wizard style */}
      <div className="md:hidden">
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button type="button" onClick={() => mobileStep === 0 ? router.back() : setMobileStep(s => s - 1)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> {mobileStep === 0 ? 'Cancel' : 'Back'}
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{STEPS[mobileStep]}</span>
          <div className="flex-1 flex items-center justify-end">
            {mobileStep < STEPS.length - 1 ? (
              <button type="button" onClick={() => setMobileStep(s => s + 1)}
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
                Next
              </button>
            ) : (
              <button type="submit" disabled={isPending}
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
                {isPending ? '...' : 'Done'}
              </button>
            )}
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1 px-4 py-2" style={{ background: 'var(--wp-bg-secondary)' }}>
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1 flex-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: i < mobileStep ? 'var(--wp-success)' : i === mobileStep ? 'var(--wp-primary)' : 'var(--wp-bg-muted)',
                  color: i <= mobileStep ? 'white' : 'var(--wp-text-muted)',
                }}>
                {i < mobileStep ? <Check size={10} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < mobileStep ? 'var(--wp-success)' : 'var(--wp-border)' }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 pb-4 md:px-0 md:pt-0">
      {formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">{formError}</div>
      )}

      {/* ① CLIENT */}
      <div className={mobileStep !== 0 ? 'hidden md:block' : ''} style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Client</p>
        <div className="space-y-4">

        <div ref={clientDropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.fields.clientName}
            {clients.length > 0 && <span className="ml-2 text-xs font-normal text-slate-400">— search existing or type new</span>}
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" required value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setClientName(e.target.value); setShowClientDropdown(true); if (!e.target.value) clearClient() }}
              onFocus={() => { if (!selectedClientId && clients.length > 0) setShowClientDropdown(true) }}
              placeholder="Client name..."
              className={`w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${selectedClientId ? 'border-[#1E3A5F]/40 bg-blue-50 text-[#1E3A5F] font-medium' : 'border-slate-200'}`}
            />
            {selectedClientId && <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          {showClientDropdown && !selectedClientId && filteredClients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {filteredClients.map(c => (
                <button key={c.id} type="button" onClick={() => selectClient(c)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientEmail}</label>
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Phone</label>
            <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="(555) 000-0000" />
          </div>
        </div>
        {/* Job — optional, at the end of client section */}
        <div ref={jobDropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t.job ?? 'Job'}
            <span className="ml-2 text-xs font-normal text-slate-400">{jobId ? '— linked' : '— optional'}</span>
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={jobSearch}
              onChange={e => { setJobSearch(e.target.value); setShowJobDropdown(true); if (!e.target.value) clearJob() }}
              onFocus={() => { if (!jobId) setShowJobDropdown(true) }}
              placeholder="Link to a job..." readOnly={!!jobId}
              className={`w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${jobId ? 'border-[#1E3A5F]/40 bg-blue-50 text-[#1E3A5F] font-medium cursor-default' : 'border-slate-200'}`}
            />
            {jobId && <button type="button" onClick={clearJob} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          {showJobDropdown && !jobId && filteredJobs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredJobs.map(j => (
                <button key={j.id} type="button" onClick={() => selectJob(j)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{j.name}</p>
                  <p className="text-xs text-slate-400">{j.clientName}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ② WORK — Line Items + Notes */}
      <div className={mobileStep !== 1 ? 'hidden md:block' : ''} style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Work</p>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">{t.lineItems.title}</h3>
          <div className="flex items-center gap-2" ref={catalogRef}>
            <div className="relative">
              <button type="button" onClick={() => setShowCatalog(!showCatalog)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1E3A5F]/30 text-[#1E3A5F] hover:bg-blue-50 font-medium">
                <BookOpen size={13} /> Item Catalog
              </button>
              {showCatalog && (
                <div className="absolute z-20 right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl">
                  <div className="p-2 border-b border-slate-100">
                    <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                      placeholder="Search catalog..." autoFocus
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCatalog.length === 0 ? (
                      <p className="text-xs text-slate-400 p-3 text-center">No items found. Add items in Settings.</p>
                    ) : filteredCatalog.map(ci => (
                      <button key={ci.id} type="button" onClick={() => addFromCatalog(ci)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-slate-700">{ci.name}</span>
                          <span className="text-xs text-slate-400">${parseFloat(ci.unitPrice).toFixed(2)}</span>
                        </div>
                        {ci.category && <span className="text-[10px] text-slate-400">{ci.category}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items — mobile: stacked cards, desktop: grid */}
        <div className="space-y-3 mb-4">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg p-3" style={{ border: '1px solid var(--wp-border-light)', background: 'var(--wp-bg-secondary)' }}>
              {/* Row 1: Type + Description + Delete */}
              <div className="flex items-center gap-2 mb-2">
                <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none shrink-0" style={{ width: '90px' }}>
                  {(Object.keys(t.lineItems.type) as LineItemType[]).map(type => <option key={type} value={type}>{t.lineItems.type[type]}</option>)}
                </select>
                <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  placeholder="Description" className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none min-w-0" />
                <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  className="shrink-0 p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              {/* Row 2: Qty + Rate + Markup + Total */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Qty</label>
                  <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Rate</label>
                  <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none" />
                </div>
                <div style={{ width: '50px' }}>
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Markup</label>
                  <input type="number" min="0" step="0.5" value={item.markupPercent || ''} onChange={e => updateItem(i, 'markupPercent', parseFloat(e.target.value) || 0)}
                    placeholder="%" className="w-full border border-slate-200 rounded px-1 py-1.5 text-xs text-center focus:outline-none" />
                </div>
                <div style={{ width: '65px' }} className="text-right">
                  <label className="text-[10px] text-slate-400 mb-0.5 block">Total</label>
                  <p className="text-xs font-bold py-1.5" style={{ color: 'var(--wp-text-primary)' }}>
                    ${(item.quantity * item.unitPrice * (1 + (item.markupPercent || 0) / 100)).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => setItems([...items, { type: 'labor', description: '', quantity: 1, unitPrice: 0, total: 0, markupPercent: 0, section: '' }])}
          className="flex items-center gap-1 text-sm text-[#F97316] hover:text-orange-600 font-medium">
          <Plus size={15} /> {t.lineItems.add}
        </button>

        {/* Notes — part of Work section */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">{t.fields.notes}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Scope details, payment terms, disclaimers..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
        </div>
      </div> {/* end Work section */}

      {/* ③ PRICING */}
      <div className={mobileStep !== 2 ? 'hidden md:block' : ''} style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pricing</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{t.fields.subtotal}</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {/* Markup — toggle */}
          <div className="flex items-center justify-between py-1.5">
            <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Markup</span>
            <div className="flex items-center gap-2">
              {showMarkup && (
                <div className="flex items-center gap-1">
                  <input type="number" min="0" step="0.5" value={globalMarkup || ''} onChange={e => setGlobalMarkup(parseFloat(e.target.value) || 0)}
                    className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none" placeholder="0" />
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>%</span>
                </div>
              )}
              <button type="button" onClick={() => { if (showMarkup) { setGlobalMarkup(0) }; setShowMarkup(!showMarkup) }}
                className={`w-11 h-6 rounded-full transition-all flex items-center ${showMarkup ? 'bg-[#1E3A5F]' : 'bg-[#E2E8F0]'}`} style={{ border: showMarkup ? '1px solid #163050' : '1px solid #CBD5E1' }}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showMarkup ? 'translate-x-[21px]' : 'translate-x-[1px]'}`} />
              </button>
            </div>
          </div>

          {/* Discount — toggle */}
          <div className="flex items-center justify-between py-1.5">
            <span style={{ fontSize: '0.8125rem', color: '#64748B' }}>Discount</span>
            <div className="flex items-center gap-2">
              {showDiscount && (
                <div className="flex items-center gap-1">
                  <select value={discountType || 'percent'} onChange={e => setDiscountType(e.target.value)}
                    className="border border-slate-200 rounded px-1.5 py-1 text-xs">
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                  <input type="number" min="0" step="0.01" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none" placeholder="0" />
                  {discount > 0 && <span style={{ fontSize: '0.6875rem', color: '#DC2626' }}>-${discount.toFixed(2)}</span>}
                </div>
              )}
              <button type="button" onClick={() => { if (showDiscount) { setDiscountValue(0); setDiscountType('') }; setShowDiscount(!showDiscount) }}
                className={`w-11 h-6 rounded-full transition-all flex items-center ${showDiscount ? 'bg-[#1E3A5F]' : 'bg-[#E2E8F0]'}`} style={{ border: showDiscount ? '1px solid #163050' : '1px solid #CBD5E1' }}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showDiscount ? 'translate-x-[21px]' : 'translate-x-[1px]'}`} />
              </button>
            </div>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>{t.fields.tax} ({taxPercent}%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 text-base pt-1">
            <span>{t.fields.total}</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div> {/* end Pricing */}

      {/* ④ PAYMENT */}
      <div className={mobileStep !== 3 ? 'hidden md:block' : ''} style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Payment</p>

        {/* Deposit — toggle */}
        <div className="flex items-center justify-between py-1.5">
          <div>
            <span style={{ fontSize: '0.8125rem', color: '#334155' }}>Request a deposit</span>
            {showDeposit && depositAmount > 0 && (
              <p style={{ fontSize: '0.6875rem', color: '#D97706', marginTop: '0.125rem' }}>
                = ${depositType === 'percent' ? (total * depositAmount / 100).toFixed(2) : depositAmount.toFixed(2)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showDeposit && (
              <div className="flex items-center gap-1">
                <select value={depositType || 'percent'} onChange={e => setDepositType(e.target.value)}
                  className="border border-slate-200 rounded px-1.5 py-1 text-xs">
                  <option value="percent">%</option>
                  <option value="fixed">$</option>
                </select>
                <input type="number" min="0" step="0.01" value={depositAmount || ''} onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                  className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none" placeholder="0" />
              </div>
            )}
            <button type="button" onClick={() => { if (showDeposit) { setDepositAmount(0); setDepositType('') }; setShowDeposit(!showDeposit) }}
              className={`w-11 h-6 rounded-full transition-all flex items-center ${showDeposit ? 'bg-[#1E3A5F]' : 'bg-[#E2E8F0]'}`} style={{ border: showDeposit ? '1px solid #163050' : '1px solid #CBD5E1' }}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showDeposit ? 'translate-x-[21px]' : 'translate-x-[1px]'}`} />
            </button>
          </div>
        </div>

        {/* Auto-generate Invoice */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-medium text-slate-700">Auto-generate Invoice</span>
              <p className="text-[10px] text-slate-400">Automatically creates an invoice when the client approves this estimate.</p>
            </div>
            <button type="button" onClick={() => setAutoInvoice(!autoInvoice)}
              className={`w-11 h-6 rounded-full transition-all flex items-center ${autoInvoice ? 'bg-[#1E3A5F]' : 'bg-[#E2E8F0]'}`} style={{ border: autoInvoice ? '1px solid #163050' : '1px solid #CBD5E1' }}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${autoInvoice ? 'translate-x-[21px]' : 'translate-x-[1px]'}`} />
            </button>
          </div>

      </div> {/* end Payment */}

      {/* ⑤ DELIVERY & APPROVAL */}
      <div className={mobileStep !== 4 ? 'hidden md:block' : ''} style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Delivery</p>

        <div className="space-y-3">
          {/* Valid Until */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.fields.validUntil}</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input text-sm" />
          </div>

          {/* Contract */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Contract</label>
            <select className="input text-sm" defaultValue="">
              <option value="">No contract</option>
              <option value="generic">Generic Contract</option>
            </select>
          </div>

          {/* Client Signature toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-medium text-slate-700">Client Signature</span>
              <p className="text-[10px] text-slate-400">Require signature when approving</p>
            </div>
            <button type="button" onClick={() => setRequireSignature(!requireSignature)}
              className={`w-11 h-6 rounded-full transition-all flex items-center ${requireSignature ? 'bg-[#1E3A5F]' : 'bg-[#E2E8F0]'}`} style={{ border: requireSignature ? '1px solid #163050' : '1px solid #CBD5E1' }}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${requireSignature ? 'translate-x-[21px]' : 'translate-x-[1px]'}`} />
            </button>
          </div>

          {/* Photos */}
          <p className="text-xs text-slate-400">Photos can be added after saving, from the estimate detail page.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
      </div> {/* end px-4 wrapper */}
    </form>
  )
}
