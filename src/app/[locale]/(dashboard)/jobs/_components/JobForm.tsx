'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createJob, updateJob } from '@/lib/actions/jobs'
import { Toast } from '@/components/Toast'
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
  const [saved, setSaved] = useState(false)

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
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
    setForm(f => ({ ...f, clientName: client.name, clientEmail: client.email ?? '', clientPhone: client.phone ?? '', address: client.address ?? f.address }))
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
          setSaved(true)
          router.push(`/${locale}/jobs/${job.id}`)
        } else {
          const created = await createJob(payload)
          setSaved(true)
          router.push(`/${locale}/jobs/${created.id}`)
        }
        router.refresh()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('PLAN_LIMIT')) setError(msg.replace('PLAN_LIMIT: ', ''))
        else setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <>
    {saved && <Toast message="Job saved successfully!" onDone={() => setSaved(false)} />}
    <form onSubmit={handleSubmit} className="bg-white md:bg-transparent min-h-full max-w-3xl">
      {/* Mobile header — Cancel | title | Done */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-0.5"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <X size={16} /> Cancel
          </button>
        </div>
        <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{job ? 'Edit Job' : 'New Job'}</span>
        <div className="flex-1 flex items-center justify-end">
          <button type="submit" disabled={isPending} style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            {isPending ? '...' : 'Done'}
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 md:px-0 md:pt-0">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 mb-3" style={{ background: 'var(--wp-error-bg)', border: '1px solid var(--wp-error)', color: 'var(--wp-error)' }}>
          <span>{error}</span>
          <a href={`/${locale}/pricing`} className="ml-auto font-semibold underline whitespace-nowrap">Upgrade to Pro</a>
        </div>
      )}

      {/* ① CLIENT */}
      <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Client</p>
        <div className="space-y-4">

        {clients.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>
              Client
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--wp-text-muted)' }}>
                {selectedClientId ? '— linked' : '— search existing or type new'}
              </span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-muted)' }} />
              <input type="text" value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearClient() }}
                onFocus={() => { if (!selectedClientId) setShowDropdown(true) }}
                placeholder="Search existing clients..." readOnly={!!selectedClientId}
                className="w-full border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none"
                style={{
                  borderColor: selectedClientId ? 'color-mix(in srgb, var(--wp-primary) 40%, transparent)' : 'var(--wp-border)',
                  background: selectedClientId ? 'var(--wp-info-bg)' : 'var(--wp-bg-primary)',
                  color: selectedClientId ? 'var(--wp-primary)' : 'var(--wp-text-primary)',
                  fontWeight: selectedClientId ? 500 : 400,
                }}
              />
              {selectedClientId && (
                <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-muted)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            {showDropdown && !selectedClientId && filteredClients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg max-h-48 overflow-y-auto" style={{ border: '1px solid var(--wp-border)', boxShadow: 'var(--wp-shadow-lg)' }}>
                {filteredClients.map(c => (
                  <button key={c.id} type="button" onClick={() => selectClient(c)}
                    className="w-full text-left px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text-primary)' }}>{c.name}</p>
                    {c.email && <p className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{c.email}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${selectedClientId ? 'opacity-60' : ''}`}>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.clientName}</label>
            <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
              readOnly={!!selectedClientId} className="input text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.clientPhone}</label>
            <input type="tel" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })}
              readOnly={!!selectedClientId} className="input text-sm" />
          </div>
        </div>
        <div className={selectedClientId ? 'opacity-60' : ''}>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.clientEmail}</label>
          <input type="email" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })}
            readOnly={!!selectedClientId} className="input text-sm" />
        </div>
        </div>
      </div>

      {/* ② JOB DETAILS */}
      <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Job Details</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.name} <span style={{ color: 'var(--wp-error)' }}>*</span></label>
            <input type="text" required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.address}</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as JobStatus })} className="input text-sm">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{t.status[s]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ③ SCHEDULE */}
      <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Schedule</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.startDate}</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="input text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.endDate}</label>
            <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={e => setForm({ ...form, endDate: e.target.value })} className="input text-sm" />
          </div>
        </div>
      </div>

      {/* ④ BUDGET */}
      <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Budget</p>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>{t.fields.budgetedCost}</label>
          <input type="number" value={form.budgetedCost} onChange={e => setForm({ ...form, budgetedCost: e.target.value })} className="input text-sm" />
        </div>
      </div>

      {/* ⑤ NOTES */}
      <div style={{ borderBottom: '1px solid var(--wp-border-light)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Notes</p>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
          style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)' }}
          placeholder="Job notes, special instructions..." />
      </div>

      {/* Actions — desktop only */}
      <div className="hidden md:flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
      </div>
    </form>
    </>
  )
}
