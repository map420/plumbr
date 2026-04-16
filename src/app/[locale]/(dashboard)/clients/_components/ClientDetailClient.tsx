'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { updateClient } from '@/lib/actions/clients'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { Toast } from '@/components/Toast'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BottomSheet } from '@/components/BottomSheet'
import { Mail, Phone, MapPin, FileText, Briefcase, Receipt, Edit2, Check, X, ChevronLeft, MoreHorizontal, PhoneCall } from 'lucide-react'
import type { EstimateStatus } from '@/lib/store/estimates'
import type { JobStatus } from '@/lib/store/jobs'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null }
type Job = { id: string; name: string; status: string; budgetedCost: string }
type Estimate = { id: string; number: string; status: string; total: string; createdAt: Date }
type Invoice = { id: string; number: string; status: string; total: string; dueDate: Date | null }

export function ClientDetailClient({ client, jobs, estimates, invoices }: {
  client: Client; jobs: Job[]; estimates: Estimate[]; invoices: Invoice[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [form, setForm] = useState({ name: client.name, email: client.email ?? '', phone: client.phone ?? '', address: client.address ?? '', notes: client.notes ?? '' })

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)

  function handleSave() {
    startTransition(async () => {
      await updateClient(client.id, form)
      setEditing(false)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <>
      {saved && <Toast message="Client updated successfully!" onDone={() => setSaved(false)} />}

      {/* More menu bottom sheet (mobile) */}
      <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
        <div className="py-1">
          <button onClick={() => { setShowMoreMenu(false); setEditing(true) }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text-primary)' }}>
            <Edit2 size={18} style={{ color: 'var(--wp-text-muted)' }} /> Edit Client
          </button>
          <Link href={`/${locale}/jobs/new`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text-primary)' }}>
            <Briefcase size={18} style={{ color: 'var(--wp-text-muted)' }} /> New Job
          </Link>
          <Link href={`/${locale}/estimates/new`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text-primary)' }}>
            <FileText size={18} style={{ color: 'var(--wp-text-muted)' }} /> New Estimate
          </Link>
        </div>
      </BottomSheet>

      {/* ── MOBILE LAYOUT ─────────────────────── */}
      <div className="md:hidden bg-white min-h-full">

        {/* Header: < Clients | Client Name | Edit */}
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button onClick={() => router.push(`/${locale}/clients`)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Clients
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{client.name}</span>
          <div className="flex-1 flex items-center justify-end">
            <button onClick={() => setEditing(!editing)}
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Action strip: CALL | EMAIL | NEW JOB | MORE */}
        <div className="grid grid-cols-4 py-2" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          {[
            { icon: PhoneCall, label: 'CALL', action: () => client.phone && window.open(`tel:${client.phone}`) },
            { icon: Mail, label: 'EMAIL', action: () => client.email && window.open(`mailto:${client.email}`) },
            { icon: Briefcase, label: 'NEW JOB', action: () => router.push(`/${locale}/jobs/new`) },
            { icon: MoreHorizontal, label: 'MORE', action: () => setShowMoreMenu(true) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} className="flex flex-col items-center gap-1 py-1.5">
              <btn.icon size={20} style={{ color: 'var(--wp-accent)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-accent)' }}>{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px mx-4 my-4" style={{ background: 'var(--wp-border-light)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {[
            { label: 'Jobs', value: jobs.length },
            { label: 'Estimates', value: estimates.length },
            { label: 'Revenue', value: `$${formatCurrencyCompact(totalRevenue)}` },
          ].map(s => (
            <div key={s.label} className="text-center py-3" style={{ background: 'white' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--wp-primary)' }}>{s.value}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Contact info (edit mode inline) */}
        <div className="px-4 pb-4">
          <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contact</p>
          {editing ? (
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Name" />
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input" placeholder="Email" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="Phone" />
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input" placeholder="Address" />
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input resize-none" placeholder="Notes" />
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={isPending} className="btn-primary btn-sm flex items-center gap-1"><Check size={14} /> Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary btn-sm flex items-center gap-1"><X size={14} /> Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {client.email && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><Mail size={14} /> {client.email}</div>}
              {client.phone && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><Phone size={14} /> {client.phone}</div>}
              {client.address && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><MapPin size={14} /> {client.address}</div>}
              {client.notes && <p className="italic" style={{ color: 'var(--wp-text-muted)' }}>{client.notes}</p>}
              {!client.email && !client.phone && !client.address && !client.notes && (
                <p style={{ color: 'var(--wp-text-muted)' }}>No contact info.</p>
              )}
            </div>
          )}
        </div>

        {/* Jobs list */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Jobs</p>
            <Link href={`/${locale}/jobs/new`} style={{ fontSize: '0.75rem', color: 'var(--wp-accent)' }}>+ New</Link>
          </div>
          {jobs.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-muted)' }}>No jobs yet.</p> : (
            <div>
              {jobs.map((j, idx) => (
                <Link key={j.id} href={`/${locale}/jobs/${j.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text-primary)' }}>{j.name}</p>
                    <JobStatusBadge status={j.status as JobStatus} label={j.status.charAt(0).toUpperCase() + j.status.slice(1)} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(j.budgetedCost)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Estimates list */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Estimates</p>
            <Link href={`/${locale}/estimates/new`} style={{ fontSize: '0.75rem', color: 'var(--wp-accent)' }}>+ New</Link>
          </div>
          {estimates.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-muted)' }}>No estimates yet.</p> : (
            <div>
              {estimates.map((e, idx) => (
                <Link key={e.id} href={`/${locale}/estimates/${e.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text-primary)' }}>{e.number}</p>
                    <EstimateStatusBadge status={e.status as EstimateStatus} label={e.status.charAt(0).toUpperCase() + e.status.slice(1)} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(e.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Invoices list */}
        <div className="px-4 pb-20">
          <p className="mb-2" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase' }}>Invoices</p>
          {invoices.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-muted)' }}>No invoices yet.</p> : (
            <div>
              {invoices.map((i, idx) => (
                <Link key={i.id} href={`/${locale}/invoices/${i.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text-primary)' }}>{i.number}</p>
                    <span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(i.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ─────────────────────── */}
      <div className="hidden md:block p-8 max-w-4xl space-y-6">
        <Breadcrumbs items={[{ label: 'Clients', href: `/${locale}/clients` }, { label: client.name }]} />

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {editing ? (
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-2xl font-bold mb-1 w-72" />
            ) : (
              <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{client.name}</h1>
            )}
            <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>Client</p>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={isPending} className="btn-primary flex items-center gap-1 text-sm"><Check size={14} /> Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1 text-sm"><X size={14} /> Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1 text-sm"><Edit2 size={14} /> Edit</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Jobs', value: jobs.length },
            { label: 'Total Estimates', value: estimates.length },
            { label: 'Total Revenue', value: `$${formatCurrencyCompact(totalRevenue)}` },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--wp-primary)' }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--wp-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold mb-3" style={{ color: 'var(--wp-text-primary)' }}>Contact Info</h2>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input mt-1" /></div>
                <div><label className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input mt-1" /></div>
              </div>
              <div><label className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input mt-1" /></div>
              <div><label className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input mt-1 resize-none" /></div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {client.email && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><Mail size={14} /> {client.email}</div>}
              {client.phone && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><Phone size={14} /> {client.phone}</div>}
              {client.address && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-secondary)' }}><MapPin size={14} /> {client.address}</div>}
              {client.notes && <p className="italic" style={{ color: 'var(--wp-text-muted)' }}>{client.notes}</p>}
              {!client.email && !client.phone && !client.address && !client.notes && (
                <p style={{ color: 'var(--wp-text-muted)' }}>No contact info.</p>
              )}
            </div>
          )}
        </div>

        {/* Jobs */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text-primary)' }}><Briefcase size={16} /> Jobs</h2>
            <Link href={`/${locale}/jobs/new`} className="text-xs hover:underline" style={{ color: 'var(--wp-primary)' }}>+ New Job</Link>
          </div>
          {jobs.length === 0 ? <p className="p-4 text-sm" style={{ color: 'var(--wp-text-muted)' }}>No jobs yet.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <td className="px-4 py-3"><Link href={`/${locale}/jobs/${j.id}`} className="font-medium hover:underline" style={{ color: 'var(--wp-primary)' }}>{j.name}</Link></td>
                    <td className="px-4 py-3"><JobStatusBadge status={j.status as JobStatus} label={j.status.charAt(0).toUpperCase() + j.status.slice(1)} /></td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(j.budgetedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Estimates */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text-primary)' }}><FileText size={16} /> Estimates</h2>
            <Link href={`/${locale}/estimates/new`} className="text-xs hover:underline" style={{ color: 'var(--wp-primary)' }}>+ New Estimate</Link>
          </div>
          {estimates.length === 0 ? <p className="p-4 text-sm" style={{ color: 'var(--wp-text-muted)' }}>No estimates yet.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {estimates.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <td className="px-4 py-3"><Link href={`/${locale}/estimates/${e.id}`} className="font-medium hover:underline" style={{ color: 'var(--wp-primary)' }}>{e.number}</Link></td>
                    <td className="px-4 py-3"><EstimateStatusBadge status={e.status as EstimateStatus} label={e.status.charAt(0).toUpperCase() + e.status.slice(1)} /></td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(e.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoices */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text-primary)' }}><Receipt size={16} /> Invoices</h2>
          </div>
          {invoices.length === 0 ? <p className="p-4 text-sm" style={{ color: 'var(--wp-text-muted)' }}>No invoices yet.</p> : (
            <table className="w-full text-sm">
              <tbody>
                {invoices.map(i => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <td className="px-4 py-3"><Link href={`/${locale}/invoices/${i.id}`} className="font-medium hover:underline" style={{ color: 'var(--wp-primary)' }}>{i.number}</Link></td>
                    <td className="px-4 py-3"><span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{i.status}</span></td>
                    <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--wp-text-secondary)' }}>${formatCurrency(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
