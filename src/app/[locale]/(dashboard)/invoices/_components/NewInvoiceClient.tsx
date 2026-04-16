'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createInvoice } from '@/lib/actions/invoices'
import { getJob } from '@/lib/actions/jobs'
import { Plus, Trash2, Search, X } from 'lucide-react'

type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type LI = { type: LineItemType; description: string; quantity: number; unitPrice: number; total: number }
type Client = { id: string; name: string; email: string | null; phone: string | null }
type T = { save: string; cancel: string; fields: Record<string, string>; lineItems: { title: string; add: string; type: Record<LineItemType, string> } }

function calcTotals(items: LI[], taxDecimal: number) {
  let subtotal = 0
  for (const li of items) subtotal += li.quantity * li.unitPrice
  const tax = Math.round(subtotal * taxDecimal * 100) / 100
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
  }
}

export function NewInvoiceClient({ translations: t, clients = [], taxPercent = 0 }: { translations: T; clients?: Client[]; taxPercent?: number }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const jobIdFromUrl = searchParams.get('jobId') ?? ''
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LI[]>([])

  const taxDecimal = taxPercent / 100

  useEffect(() => {
    if (!jobIdFromUrl) return
    getJob(jobIdFromUrl).then(job => {
      if (!job) return
      setClientName(job.clientName ?? '')
      setClientEmail(job.clientEmail ?? '')
      setClientPhone(job.clientPhone ?? '')
      setClientSearch(job.clientName ?? '')
    })
  }, [jobIdFromUrl])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) setShowClientDropdown(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function selectClient(c: Client) {
    setSelectedClientId(c.id)
    setClientName(c.name)
    setClientEmail(c.email ?? '')
    setClientPhone(c.phone ?? '')
    setClientSearch(c.name)
    setShowClientDropdown(false)
  }

  function clearClient() {
    setSelectedClientId(null); setClientSearch(''); setClientName(''); setClientEmail(''); setClientPhone('')
  }

  function updateItem(i: number, field: keyof LI, value: string | number) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'quantity' || field === 'unitPrice') {
      updated[i].total = Math.round(updated[i].quantity * updated[i].unitPrice * 100) / 100
    }
    setItems(updated)
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  const { subtotal, tax, total } = calcTotals(items, taxDecimal)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (!clientName.trim()) { setFormError('Client name is required.'); return }
    if (items.length === 0) { setFormError('Add at least one line item.'); return }
    startTransition(async () => {
      const rawItems = items.map(li => ({ type: li.type, description: li.description, quantity: li.quantity, unitPrice: li.unitPrice, total: li.total }))
      const invoice = await createInvoice({
        jobId: jobIdFromUrl,
        estimateId: '',
        clientId: selectedClientId ?? '',
        clientName,
        clientEmail,
        clientPhone,
        status: 'draft',
        subtotal, tax, total,
        dueDate: dueDate ? new Date(dueDate).toISOString() : '',
        notes,
      }, rawItems)
      router.push(`/${locale}/invoices/${invoice.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white md:bg-transparent min-h-full max-w-3xl">
      {/* Mobile header */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button type="button" onClick={() => router.back()} className="flex items-center gap-0.5" style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <X size={16} /> Cancel
          </button>
        </div>
        <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>New Invoice</span>
        <div className="flex-1 flex items-center justify-end">
          <button type="submit" disabled={isPending} style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            {isPending ? '...' : 'Done'}
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 md:px-0 md:pt-0">
        {formError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">{formError}</div>
        )}

        {/* ① CLIENT */}
        <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
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
          </div>
        </div>

        {/* ② LINE ITEMS */}
        <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Work</p>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">{t.lineItems.title}</h3>
          </div>

          <div className="space-y-3 mb-4">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg p-3" style={{ border: '1px solid var(--wp-border-light)', background: 'var(--wp-bg-secondary)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value as LineItemType)}
                    className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none shrink-0" style={{ width: '90px' }}>
                    {(Object.keys(t.lineItems.type) as LineItemType[]).map(type => <option key={type} value={type}>{t.lineItems.type[type]}</option>)}
                  </select>
                  <input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                    placeholder="Description" className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none min-w-0" />
                  <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                    className="shrink-0 p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
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
                  <div style={{ width: '80px' }} className="text-right">
                    <label className="text-[10px] text-slate-400 mb-0.5 block">Total</label>
                    <p className="text-xs font-bold py-1.5" style={{ color: 'var(--wp-text-primary)' }}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setItems([...items, { type: 'labor', description: '', quantity: 1, unitPrice: 0, total: 0 }])}
            className="flex items-center gap-1 text-sm text-[#F97316] hover:text-orange-600 font-medium">
            <Plus size={15} /> {t.lineItems.add}
          </button>
        </div>

        {/* ③ PRICING */}
        <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pricing</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>{t.fields.subtotal}</span>
              <span>${subtotal.toFixed(2)}</span>
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
        </div>

        {/* ④ DETAILS */}
        <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Details</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.dueDate}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.notes}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment terms, scope details..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)' }} />
            </div>
          </div>
        </div>

        {/* Actions — desktop only */}
        <div className="hidden md:flex gap-3">
          <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
        </div>
      </div>
    </form>
  )
}
