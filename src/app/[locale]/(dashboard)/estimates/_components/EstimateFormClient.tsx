'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createEstimate } from '@/lib/actions/estimates'
import { getJobs } from '@/lib/actions/jobs'
import { updateEstimate } from '@/lib/actions/estimates'
import { getCatalogItems, createCatalogItem } from '@/lib/actions/catalog'
import { Plus, Trash2, Search, X, BookOpen, Check, ChevronLeft, ArrowLeft, ArrowRight } from 'lucide-react'
import { Toggle, SideCard, TotalsCard } from '@/components/ui'

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

const STEPS = ['Client', 'Work', 'Pricing', 'Payment', 'Delivery'] as const

export function EstimateFormClient({ translations: t, estimate, clients = [], taxPercent = 0 }: { translations: T; estimate?: Estimate; clients?: Client[]; taxPercent?: number }) {
  const taxDecimal = taxPercent / 100
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  // Same step state is now used on both mobile and desktop (stepper everywhere)
  const [step, setStep] = useState(0)
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
  const [discountType, setDiscountType] = useState('')
  const [discountValue, setDiscountValue] = useState(0)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showMarkup, setShowMarkup] = useState(false)

  // Deposit
  const [depositType, setDepositType] = useState('')
  const [depositAmount, setDepositAmount] = useState(0)
  const [showDeposit, setShowDeposit] = useState(false)

  // Auto-generate invoice & signature
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

  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  return (
    <form onSubmit={handleSubmit} className="bg-white md:bg-transparent min-h-full">
      {/* ══════════════ MOBILE HEADER (wizard) ══════════════ */}
      <div className="md:hidden">
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button type="button" onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text)', lineHeight: '1.25rem' }}>{STEPS[step]}</span>
          <div className="flex-1 flex items-center justify-end">
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(s => s + 1)}
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
                Next
              </button>
            ) : (
              <button type="submit" disabled={isPending}
                style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
                {isPending ? '...' : 'Done'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 py-2" style={{ background: 'var(--wp-surface-2)' }}>
          {STEPS.map((stepLabel, i) => (
            <div key={stepLabel} className="flex items-center gap-1 flex-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{
                  background: i < step ? 'var(--wp-success-v2)' : i === step ? 'var(--wp-brand)' : 'var(--wp-surface-3)',
                  color: i <= step ? 'white' : 'var(--wp-text-3)',
                }}>
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: i < step ? 'var(--wp-success-v2)' : 'var(--wp-border-v2)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ DESKTOP HEADER + STEPPER (new in v2) ══════════════ */}
      <div className="hidden md:block p-8 pb-0 max-w-5xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--wp-text-3)' }}>
              {estimate ? 'Estimates / Edit' : 'Estimates / New'}
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--wp-text)' }}>
              {estimate
                ? (locale === 'es' ? 'Editar estimate' : 'Edit estimate')
                : (locale === 'es' ? 'Crear estimate' : 'Create estimate')}
            </h1>
            <div className="text-xs mt-1 flex items-center gap-3" style={{ color: 'var(--wp-text-3)' }}>
              <span>{locale === 'es' ? `Paso ${step + 1} de ${STEPS.length}` : `Step ${step + 1} of ${STEPS.length}`} · {STEPS[step]}</span>
              <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--wp-success-v2)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-success-v2)' }} />
                {locale === 'es' ? 'Auto-guardado' : 'Auto-saved'}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => router.back()} className="btn-ghost btn-sm">
            <X size={14} /> {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        </div>

        {/* Desktop stepper pills */}
        <div className="flex gap-1.5 mb-5" role="tablist">
          {STEPS.map((stepLabel, i) => {
            const done = i < step
            const active = i === step
            return (
              <button
                key={stepLabel}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStep(i)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
                style={{
                  background: active ? 'var(--wp-brand)' : 'transparent',
                  color: active ? 'white' : done ? 'var(--wp-success-v2)' : 'var(--wp-text-3)',
                  fontWeight: active ? 600 : 500,
                  border: active ? 'none' : `1px solid var(--wp-border-v2)`,
                }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    width: 20, height: 20,
                    background: active ? 'rgb(255 255 255 / 0.2)' : done ? 'var(--wp-success-bg-v2)' : 'var(--wp-surface-3)',
                    color: active ? 'white' : done ? 'var(--wp-success-v2)' : 'var(--wp-text-3)',
                  }}
                >
                  {done ? <Check size={11} /> : i + 1}
                </span>
                {stepLabel}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════ BODY ══════════════ */}
      <div className="md:p-8 md:pt-0 max-w-5xl">
        <div className="md:grid md:grid-cols-[1fr_300px] md:gap-4 md:items-start">
          <div className="px-4 pt-3 pb-4 md:px-0 md:pt-0">
            {formError && (
              <div className="rounded-lg px-4 py-3 text-sm mb-3" style={{ background: 'var(--wp-error-bg-v2)', border: '1px solid var(--wp-error-border)', color: 'var(--wp-error-v2)' }}>
                {formError}
              </div>
            )}

            {/* STEP 1 · CLIENT */}
            {step === 0 && (
              <div className="card p-5 md:p-6">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Cliente' : 'Client'}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--wp-text-2)' }}>
                  {locale === 'es' ? 'Elige un cliente existente o crea uno nuevo.' : 'Pick an existing client or type a new name.'}
                </p>
                <div className="space-y-4">
                  <div ref={clientDropdownRef} className="relative">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>
                      {t.fields.clientName}
                      {clients.length > 0 && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--wp-text-3)' }}>
                        — {locale === 'es' ? 'busca existente o escribe nuevo' : 'search existing or type new'}
                      </span>}
                    </label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-3)' }} />
                      <input type="text" required value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setClientName(e.target.value); setShowClientDropdown(true); if (!e.target.value) clearClient() }}
                        onFocus={() => { if (!selectedClientId && clients.length > 0) setShowClientDropdown(true) }}
                        placeholder="Client name..."
                        className="w-full rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none"
                        style={{
                          border: `1px solid ${selectedClientId ? 'var(--wp-brand)' : 'var(--wp-border-v2)'}`,
                          background: selectedClientId ? 'var(--wp-brand-subtle)' : 'var(--wp-surface)',
                          color: selectedClientId ? 'var(--wp-brand)' : 'var(--wp-text)',
                          fontWeight: selectedClientId ? 500 : 400,
                        }}
                      />
                      {selectedClientId && <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-3)' }}><X size={14} /></button>}
                    </div>
                    {showClientDropdown && !selectedClientId && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-y-auto" style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-3)' }}>
                        {filteredClients.map(c => (
                          <button key={c.id} type="button" onClick={() => selectClient(c)} className="w-full text-left px-4 py-2.5 hover:bg-[var(--wp-surface-2)]" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                            <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{c.name}</p>
                            {c.email && <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{c.email}</p>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                    <div className="min-w-0">
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>{t.fields.clientEmail}</label>
                      <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="input" placeholder={locale === 'es' ? 'correo@ejemplo.com' : 'name@example.com'} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? 'Teléfono' : 'Phone'}
                      </label>
                      <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="input" placeholder="(555) 000-0000" />
                    </div>
                  </div>

                  <div ref={jobDropdownRef} className="relative">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>
                      {locale === 'es' ? 'Trabajo' : 'Job'}
                      <span className="ml-2 text-xs font-normal" style={{ color: 'var(--wp-text-3)' }}>
                        {jobId ? (locale === 'es' ? '— vinculado' : '— linked') : (locale === 'es' ? '— opcional' : '— optional')}
                      </span>
                    </label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-3)' }} />
                      <input type="text" value={jobSearch}
                        onChange={e => { setJobSearch(e.target.value); setShowJobDropdown(true); if (!e.target.value) clearJob() }}
                        onFocus={() => { if (!jobId) setShowJobDropdown(true) }}
                        placeholder="Link to a job..." readOnly={!!jobId}
                        className="w-full rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none"
                        style={{
                          border: `1px solid ${jobId ? 'var(--wp-brand)' : 'var(--wp-border-v2)'}`,
                          background: jobId ? 'var(--wp-brand-subtle)' : 'var(--wp-surface)',
                          color: jobId ? 'var(--wp-brand)' : 'var(--wp-text)',
                          fontWeight: jobId ? 500 : 400,
                          cursor: jobId ? 'default' : 'text',
                        }}
                      />
                      {jobId && <button type="button" onClick={clearJob} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-3)' }}><X size={14} /></button>}
                    </div>
                    {showJobDropdown && !jobId && filteredJobs.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-3)' }}>
                        {filteredJobs.map(j => (
                          <button key={j.id} type="button" onClick={() => selectJob(j)} className="w-full text-left px-4 py-2.5 hover:bg-[var(--wp-surface-2)]" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                            <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{j.name}</p>
                            <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{j.clientName}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 · WORK */}
            {step === 1 && (
              <div className="card p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>{t.lineItems.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                      {locale === 'es' ? 'Añade las líneas del presupuesto' : 'Add line items to this estimate'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 relative" ref={catalogRef}>
                    <button type="button" onClick={() => setShowCatalog(!showCatalog)} className="btn-secondary btn-sm">
                      <BookOpen size={13} /> {locale === 'es' ? 'Catálogo' : 'Catalog'}
                    </button>
                    {showCatalog && (
                      <div className="absolute z-20 right-0 top-full mt-1 w-72 rounded-lg overflow-hidden" style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-3)' }}>
                        <div className="p-2" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                          <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                            placeholder="Search catalog..." autoFocus
                            className="w-full rounded px-2 py-1.5 text-xs focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCatalog.length === 0 ? (
                            <p className="text-xs p-3 text-center" style={{ color: 'var(--wp-text-3)' }}>No items found. Add items in Settings.</p>
                          ) : filteredCatalog.map(ci => (
                            <button key={ci.id} type="button" onClick={() => addFromCatalog(ci)}
                              className="w-full text-left px-3 py-2 hover:bg-[var(--wp-surface-2)]" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                              <div className="flex justify-between">
                                <span className="text-xs font-medium" style={{ color: 'var(--wp-text)' }}>{ci.name}</span>
                                <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>${parseFloat(ci.unitPrice).toFixed(2)}</span>
                              </div>
                              {ci.category && <span className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{ci.category}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {items.map((item, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ border: '1px solid var(--wp-border-v2)', background: 'var(--wp-surface)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}
                          className="rounded px-2 py-1.5 text-xs focus:outline-none shrink-0" style={{ border: '1px solid var(--wp-border-v2)', width: '100px' }}>
                          {(Object.keys(t.lineItems.type) as LineItemType[]).map(type => <option key={type} value={type}>{t.lineItems.type[type]}</option>)}
                        </select>
                        <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                          placeholder="Description" className="flex-1 rounded px-2 py-1.5 text-sm focus:outline-none min-w-0" style={{ border: '1px solid var(--wp-border-v2)' }} />
                        <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                          className="shrink-0 p-1 rounded hover:bg-[var(--wp-error-bg-v2)]" style={{ color: 'var(--wp-text-3)' }}
                          aria-label="Delete item">
                          <Trash2 size={14} className="hover:!text-red-500" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--wp-text-3)' }}>Qty</label>
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full rounded px-2 py-1.5 text-xs text-center focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--wp-text-3)' }}>Rate</label>
                          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full rounded px-2 py-1.5 text-xs text-right focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} />
                        </div>
                        <div style={{ width: '55px' }}>
                          <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--wp-text-3)' }}>Markup</label>
                          <input type="number" min="0" step="0.5" value={item.markupPercent || ''} onChange={e => updateItem(i, 'markupPercent', parseFloat(e.target.value) || 0)}
                            placeholder="%" className="w-full rounded px-1 py-1.5 text-xs text-center focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} />
                        </div>
                        <div style={{ width: '75px' }} className="text-right">
                          <label className="text-[10px] mb-0.5 block" style={{ color: 'var(--wp-text-3)' }}>Total</label>
                          <p className="text-sm font-bold py-1.5 tabular-nums" style={{ color: 'var(--wp-text)' }}>
                            ${(item.quantity * item.unitPrice * (1 + (item.markupPercent || 0) / 100)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setItems([...items, { type: 'labor', description: '', quantity: 1, unitPrice: 0, total: 0, markupPercent: 0, section: '' }])}
                  className="w-full rounded-md py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                  style={{ border: '1px dashed var(--wp-border-v2)', color: 'var(--wp-brand)', background: 'var(--wp-surface)' }}>
                  <Plus size={15} /> {t.lineItems.add}
                </button>

                <div className="mt-4">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>{t.fields.notes}</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={locale === 'es' ? 'Detalles, términos de pago, exclusiones...' : 'Scope details, payment terms, disclaimers...'}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={{ border: '1px solid var(--wp-border-v2)' }} />
                </div>
              </div>
            )}

            {/* STEP 3 · PRICING */}
            {step === 2 && (
              <div className="card p-5 md:p-6">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Precios y ajustes' : 'Pricing'}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--wp-text-2)' }}>
                  {locale === 'es' ? 'Markup global, descuento e impuestos' : 'Apply markup, discount, and review the tax.'}
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {locale === 'es' ? 'Markup global' : 'Apply global markup'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? 'Se aplica % sobre todas las líneas' : 'Applies a % on top of all line items'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showMarkup && (
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" step="0.5" value={globalMarkup || ''} onChange={e => setGlobalMarkup(parseFloat(e.target.value) || 0)}
                            className="w-16 rounded px-2 py-1 text-xs text-right focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} placeholder="0" />
                          <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>%</span>
                        </div>
                      )}
                      <Toggle
                        checked={showMarkup}
                        onChange={(on) => { if (!on) setGlobalMarkup(0); setShowMarkup(on) }}
                        aria-label="Toggle global markup"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {locale === 'es' ? 'Descuento' : 'Discount'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? '% o cantidad fija' : 'Percent or fixed amount'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showDiscount && (
                        <div className="flex items-center gap-1">
                          <select value={discountType || 'percent'} onChange={e => setDiscountType(e.target.value)}
                            className="rounded px-1.5 py-1 text-xs" style={{ border: '1px solid var(--wp-border-v2)' }}>
                            <option value="percent">%</option>
                            <option value="fixed">$</option>
                          </select>
                          <input type="number" min="0" step="0.01" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                            className="w-16 rounded px-2 py-1 text-xs text-right focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} placeholder="0" />
                          {discount > 0 && <span className="text-xs" style={{ color: 'var(--wp-error-v2)' }}>-${discount.toFixed(2)}</span>}
                        </div>
                      )}
                      <Toggle
                        checked={showDiscount}
                        onChange={(on) => { if (!on) { setDiscountValue(0); setDiscountType('') } setShowDiscount(on) }}
                        aria-label="Toggle discount"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {t.fields.tax} ({taxPercent}%)
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? 'Tasa por defecto en Settings' : 'Default rate from Settings'}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums" style={{ color: 'var(--wp-text)' }}>${tax.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 · PAYMENT */}
            {step === 3 && (
              <div className="card p-5 md:p-6">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Términos de pago' : 'Payment terms'}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--wp-text-2)' }}>
                  {locale === 'es' ? 'Depósito y auto-factura al aprobar' : 'Deposit and auto-invoice on approval'}
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {locale === 'es' ? 'Pedir depósito' : 'Request a deposit'}
                      </div>
                      {showDeposit && depositAmount > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--wp-warning-v2)' }}>
                          = ${depositType === 'percent' ? (total * depositAmount / 100).toFixed(2) : depositAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {showDeposit && (
                        <div className="flex items-center gap-1">
                          <select value={depositType || 'percent'} onChange={e => setDepositType(e.target.value)}
                            className="rounded px-1.5 py-1 text-xs" style={{ border: '1px solid var(--wp-border-v2)' }}>
                            <option value="percent">%</option>
                            <option value="fixed">$</option>
                          </select>
                          <input type="number" min="0" step="0.01" value={depositAmount || ''} onChange={e => setDepositAmount(parseFloat(e.target.value) || 0)}
                            className="w-16 rounded px-2 py-1 text-xs text-right focus:outline-none" style={{ border: '1px solid var(--wp-border-v2)' }} placeholder="0" />
                        </div>
                      )}
                      <Toggle
                        checked={showDeposit}
                        onChange={(on) => { if (!on) { setDepositAmount(0); setDepositType('') } setShowDeposit(on) }}
                        aria-label="Toggle deposit"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {locale === 'es' ? 'Auto-generar factura al aprobar' : 'Auto-generate invoice on approval'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? 'Crea la factura automáticamente cuando el cliente aprueba.' : 'Creates an invoice automatically when the client approves.'}
                      </div>
                    </div>
                    <Toggle
                      checked={autoInvoice}
                      onChange={setAutoInvoice}
                      aria-label="Auto-generate invoice"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 · DELIVERY */}
            {step === 4 && (
              <div className="card p-5 md:p-6">
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Envío y aprobación' : 'Delivery'}
                </h3>
                <p className="text-xs mb-4" style={{ color: 'var(--wp-text-2)' }}>
                  {locale === 'es' ? 'Validez, contrato y firma.' : 'Validity, contract and signature.'}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>{t.fields.validUntil}</label>
                    <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input text-sm" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>
                      {locale === 'es' ? 'Contrato' : 'Contract'}
                    </label>
                    <select className="input text-sm" defaultValue="">
                      <option value="">{locale === 'es' ? 'Sin contrato' : 'No contract'}</option>
                      <option value="generic">{locale === 'es' ? 'Contrato genérico' : 'Generic Contract'}</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                        {locale === 'es' ? 'Firma del cliente' : 'Client Signature'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                        {locale === 'es' ? 'Requiere firma al aprobar' : 'Require signature when approving'}
                      </div>
                    </div>
                    <Toggle
                      checked={requireSignature}
                      onChange={setRequireSignature}
                      aria-label="Require signature"
                    />
                  </div>

                  <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
                    {locale === 'es' ? 'Las fotos se pueden añadir después desde la vista de detalle.' : 'Photos can be added after saving, from the estimate detail page.'}
                  </p>
                </div>
              </div>
            )}

            {/* Desktop nav buttons */}
            <div className="hidden md:flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={isFirstStep}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                <ArrowLeft size={14} /> {locale === 'es' ? 'Atrás' : 'Back'}
              </button>
              {isLastStep ? (
                <div className="flex gap-2">
                  <button type="submit" disabled={isPending} className="btn-secondary btn-sm">
                    {isPending ? '...' : (locale === 'es' ? 'Guardar borrador' : 'Save draft')}
                  </button>
                  <button type="submit" disabled={isPending} className="btn-primary btn-sm">
                    {isPending ? '...' : (locale === 'es' ? 'Guardar y enviar' : 'Save & send')}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setStep(s => s + 1)} className="btn-primary btn-sm">
                  {locale === 'es' ? 'Continuar' : 'Continue'} <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Desktop sidebar — live totals */}
          <div className="hidden md:block">
            <div className="sticky top-4 flex flex-col gap-3">
              <TotalsCard
                label={locale === 'es' ? 'Total en vivo' : 'Live total'}
                total={`$${total.toFixed(2)}`}
                rows={[
                  { k: 'Subtotal', v: `$${subtotal.toFixed(2)}` },
                  ...(discount > 0 ? [{ k: locale === 'es' ? 'Descuento' : 'Discount', v: `−$${discount.toFixed(2)}` }] : []),
                  { k: `${t.fields.tax} (${taxPercent}%)`, v: `$${tax.toFixed(2)}` },
                  ...(showDeposit && depositAmount > 0 ? [{
                    k: locale === 'es' ? 'Depósito' : 'Deposit',
                    v: `$${depositType === 'percent' ? (total * depositAmount / 100).toFixed(2) : depositAmount.toFixed(2)}`,
                    emphasis: true,
                  }] : []),
                ]}
              />
              <SideCard label={locale === 'es' ? 'Resumen' : 'Summary'}>
                <div className="text-xs flex flex-col gap-1.5" style={{ color: 'var(--wp-text-2)' }}>
                  <div className="flex justify-between">
                    <span>{locale === 'es' ? 'Cliente' : 'Client'}</span>
                    <strong style={{ color: 'var(--wp-text)', fontWeight: 500 }}>{clientName || '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{locale === 'es' ? 'Líneas' : 'Line items'}</span>
                    <strong style={{ color: 'var(--wp-text)', fontWeight: 500 }}>{items.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{locale === 'es' ? 'Válido hasta' : 'Valid until'}</span>
                    <strong style={{ color: 'var(--wp-text)', fontWeight: 500 }}>
                      {validUntil ? new Date(validUntil).toLocaleDateString() : '—'}
                    </strong>
                  </div>
                </div>
              </SideCard>
            </div>
          </div>
        </div>

        {/* Mobile submit button */}
        <div className="md:hidden px-4 pb-4 flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50 flex-1">
            {isPending ? '...' : t.save}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
            {t.cancel}
          </button>
        </div>
      </div>
    </form>
  )
}
