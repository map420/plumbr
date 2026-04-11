'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createJob, updateJob } from '@/lib/actions/jobs'
import { Search, X } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientId: string | null; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string | null; actualCost: string | null; startDate: Date | null; endDate: Date | null; notes: string | null }
type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }
type FormTranslations = { save: string; cancel: string; fields: Record<string, string>; status: Record<JobStatus, string> }

const STATUS_OPTIONS: JobStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

export function JobForm({ translations: t, job, clients = [] }: { translations: FormTranslations; job?: Job; clients?: Client[] }) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Initialize search with existing client name if editing a linked job
  const existingClient = job?.clientId ? clients.find(c => c.id === job.clientId) : null
  const [clientSearch, setClientSearch] = useState(existingClient?.name ?? '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(job?.clientId ?? null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    name: job?.name ?? '',
    clientName: job?.clientName ?? '',
    clientEmail: job?.clientEmail ?? '',
    clientPhone: job?.clientPhone ?? '',
    address: job?.address ?? '',
    status: (job?.status ?? 'lead') as JobStatus,
    budgetedCost: job?.budgetedCost ?? '0',
    actualCost: job?.actualCost ?? '0',
    startDate: job?.startDate ? new Date(job.startDate).toISOString().split('T')[0] : '',
    endDate: job?.endDate ? new Date(job.endDate).toISOString().split('T')[0] : '',
    notes: job?.notes ?? '',
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  function selectClient(client: Client) {
    setSelectedClientId(client.id)
    setForm(f => ({
      ...f,
      clientName: client.name,
      clientEmail: client.email ?? '',
      clientPhone: client.phone ?? '',
      address: client.address ?? f.address,
    }))
    setClientSearch(client.name)
    setShowDropdown(false)
  }

  function clearClient() {
    setSelectedClientId(null)
    setClientSearch('')
    setForm(f => ({ ...f, clientName: '', clientEmail: '', clientPhone: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const payload = { ...form, clientId: selectedClientId ?? '' }
        if (job) {
          await updateJob(job.id, payload)
          router.push(`/${locale}/jobs/${job.id}`)
        } else {
          const created = await createJob(payload)
          router.push(`/${locale}/jobs/${created.id}`)
        }
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('PLAN_LIMIT')) {
          setError(msg.replace('PLAN_LIMIT: ', ''))
        } else {
          setError('Something went wrong. Please try again.')
        }
      }
    })
  }

  const field = (id: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={form[id] as string} onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="plumbr-card p-6 space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span>{error}</span>
          <a href={`/${locale}/pricing`} className="ml-auto font-semibold underline whitespace-nowrap">Upgrade to Pro</a>
        </div>
      )}

      {field('name', t.fields.name)}

      {/* Client autocomplete */}
      {clients.length > 0 && (
        <div ref={dropdownRef} className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Client
            <span className="ml-2 text-xs font-normal text-slate-400">
              {selectedClientId ? '— linked to existing client' : '— search existing or fill fields below for new'}
            </span>
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearClient() }}
              onFocus={() => { if (!selectedClientId) setShowDropdown(true) }}
              placeholder="Search existing clients..."
              readOnly={!!selectedClientId}
              className={`w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${selectedClientId ? 'border-[#1E3A5F]/40 bg-blue-50 text-[#1E3A5F] font-medium cursor-default' : 'border-slate-200'}`}
            />
            {selectedClientId && (
              <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Remove client link">
                <X size={14} />
              </button>
            )}
          </div>
          {showDropdown && !selectedClientId && filteredClients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredClients.map(c => (
                <button key={c.id} type="button" onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{c.name}</p>
                  {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${selectedClientId ? 'opacity-60' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientName}</label>
          <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
            readOnly={!!selectedClientId}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${selectedClientId ? 'bg-slate-50 cursor-default' : ''}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientPhone}</label>
          <input type="tel" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })}
            readOnly={!!selectedClientId}
            className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${selectedClientId ? 'bg-slate-50 cursor-default' : ''}`} />
        </div>
      </div>
      <div className={selectedClientId ? 'opacity-60' : ''}>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.clientEmail}</label>
        <input type="email" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })}
          readOnly={!!selectedClientId}
          className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 ${selectedClientId ? 'bg-slate-50 cursor-default' : ''}`} />
      </div>
      {field('address', t.fields.address)}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field('startDate', t.fields.startDate, 'date')}
        {field('endDate', t.fields.endDate, 'date')}
      </div>
      {field('budgetedCost', t.fields.budgetedCost, 'number')}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.notes}</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
