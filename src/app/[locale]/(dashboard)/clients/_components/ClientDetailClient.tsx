'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { updateClient } from '@/lib/actions/clients'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { deriveEstimateStatus, deriveJobStatus, deriveInvoiceStatus } from '@/lib/status/derived'
import { Toast } from '@/components/Toast'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BottomSheet } from '@/components/BottomSheet'
import { Mail, Phone, MapPin, FileText, Briefcase, Receipt, Edit2, Check, X, ChevronLeft, MoreHorizontal, PhoneCall, Plus, PenLine, DollarSign, Paperclip } from 'lucide-react'
import type { EstimateStatus } from '@/lib/store/estimates'
import type { JobStatus } from '@/lib/store/jobs'
import {
  DocHero, DocMeta,
  DetailSidebar, SideCard,
  TotalsCard,
  ClientAvatar,
} from '@/components/ui'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null }
type Job = { id: string; name: string; status: string; budgetedCost: string; startDate?: Date | null }
type Estimate = { id: string; number: string; status: string; total: string; createdAt: Date; jobId: string | null; validUntil?: Date | null; allowExpire?: boolean | null; signatureDataUrl?: string | null; depositPaid?: boolean | null; contractId?: string | null }
type Invoice = { id: string; number: string; status: string; total: string; dueDate: Date | null; paidAt: Date | null; jobId: string | null }

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

  // E5 / TRV-008 — billed = Σ emitidas (sent/overdue/paid); lifetimeValue = Σ pagadas
  const totalBilled = invoices.filter(i => i.status !== 'draft' && i.status !== 'cancelled').reduce((s, i) => s + parseFloat(i.total), 0)
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
  const outstanding = invoices.filter(i => { const d = deriveInvoiceStatus(i); return d === 'sent' || d === 'overdue' }).reduce((s, i) => s + parseFloat(i.total), 0)
  const activeJobs = jobs.filter(j => j.status === 'active').length
  const jobById = new Map(jobs.map(j => [j.id, j]))

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
      {saved && <Toast message={locale === 'es' ? 'Cliente actualizado' : 'Client updated'} onDone={() => setSaved(false)} />}

      {/* More menu bottom sheet (mobile) */}
      <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
        <div className="py-1">
          <button onClick={() => { setShowMoreMenu(false); setEditing(true) }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text)' }}>
            <Edit2 size={18} style={{ color: 'var(--wp-text-3)' }} /> Edit Client
          </button>
          <Link href={`/${locale}/projects/new?clientId=${client.id}`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text)' }}>
            <Briefcase size={18} style={{ color: 'var(--wp-text-3)' }} /> New Job
          </Link>
          <Link href={`/${locale}/estimates/new`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text)' }}>
            <FileText size={18} style={{ color: 'var(--wp-text-3)' }} /> New Estimate
          </Link>
        </div>
      </BottomSheet>

      {/* ══════════════ MOBILE LAYOUT (preserved) ══════════════ */}
      <div className="md:hidden bg-card min-h-full">
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button onClick={() => router.push(`/${locale}/clients`)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Clients
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text)', lineHeight: '1.25rem' }}>{client.name}</span>
          <div className="flex-1 flex items-center justify-end">
            <button onClick={() => setEditing(!editing)}
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 py-2" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          {[
            { icon: PhoneCall, label: 'CALL', action: () => client.phone && window.open(`tel:${client.phone}`) },
            { icon: Mail, label: 'EMAIL', action: () => client.email && window.open(`mailto:${client.email}`) },
            { icon: Briefcase, label: 'NEW PROJECT', action: () => router.push(`/${locale}/projects/new?clientId=${client.id}`) },
            { icon: MoreHorizontal, label: 'MORE', action: () => setShowMoreMenu(true) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action} className="flex flex-col items-center gap-1 py-1.5">
              <btn.icon size={20} style={{ color: 'var(--wp-brand)' }} />
              <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-brand)' }}>{btn.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-px mx-4 my-4" style={{ background: 'var(--wp-border-v2)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {[
            { label: locale === 'es' ? 'Proyectos' : 'Projects', value: jobs.length },
            { label: 'Estimates', value: estimates.length },
            { label: 'Revenue', value: `$${formatCurrencyCompact(totalRevenue)}` },
          ].map(s => (
            <div key={s.label} className="text-center py-3" style={{ background: 'white' }}>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--wp-brand)' }}>{s.value}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-3)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contact</p>
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
              {client.email && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-2)' }}><Mail size={14} /> {client.email}</div>}
              {client.phone && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-2)' }}><Phone size={14} /> {client.phone}</div>}
              {client.address && <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-2)' }}><MapPin size={14} /> {client.address}</div>}
              {client.notes && <p className="italic" style={{ color: 'var(--wp-text-3)' }}>{client.notes}</p>}
              {!client.email && !client.phone && !client.address && !client.notes && (
                <p style={{ color: 'var(--wp-text-3)' }}>No contact info.</p>
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-text-3)', textTransform: 'uppercase' }}>Jobs</p>
            <Link href={`/${locale}/projects/new?clientId=${client.id}`} style={{ fontSize: '0.75rem', color: 'var(--wp-brand)' }}>+ New</Link>
          </div>
          {jobs.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-3)' }}>No jobs yet.</p> : (
            <div>
              {jobs.map((j, idx) => (
                <Link key={j.id} href={`/${locale}/projects/${j.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{j.name}</p>
                    {(() => {
                      const derived = deriveJobStatus(j)
                      return <JobStatusBadge status={derived} label={derived.charAt(0).toUpperCase() + derived.slice(1)} />
                    })()}
                  </div>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--wp-text-2)' }}>${formatCurrency(j.budgetedCost)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-text-3)', textTransform: 'uppercase' }}>Estimates</p>
            <Link href={`/${locale}/estimates/new`} style={{ fontSize: '0.75rem', color: 'var(--wp-brand)' }}>+ New</Link>
          </div>
          {estimates.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-3)' }}>No estimates yet.</p> : (
            <div>
              {estimates.map((e, idx) => (
                <Link key={e.id} href={`/${locale}/estimates/${e.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{e.number}</p>
                      {e.signatureDataUrl && <PenLine size={12} style={{ color: 'var(--wp-success-v2)' }} aria-label="Signed" />}
                      {e.depositPaid && <DollarSign size={12} style={{ color: 'var(--wp-success-v2)' }} aria-label="Deposit paid" />}
                      {e.contractId && <Paperclip size={12} style={{ color: 'var(--wp-text-3)' }} aria-label="Contract attached" />}
                    </div>
                    {(() => {
                      const derived = deriveEstimateStatus(e)
                      return <EstimateStatusBadge status={derived as EstimateStatus} label={derived.charAt(0).toUpperCase() + derived.slice(1)} />
                    })()}
                  </div>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--wp-text-2)' }}>${formatCurrency(e.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-20">
          <p className="mb-2" style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--wp-text-3)', textTransform: 'uppercase' }}>Invoices</p>
          {invoices.length === 0 ? <p className="text-sm py-2" style={{ color: 'var(--wp-text-3)' }}>No invoices yet.</p> : (
            <div>
              {invoices.map((i, idx) => (
                <Link key={i.id} href={`/${locale}/invoices/${i.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{i.number}</p>
                    <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{i.dueDate ? new Date(i.dueDate).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : '—'}</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--wp-text-2)' }}>${formatCurrency(i.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ DESKTOP LAYOUT (v2 refactored) ══════════════ */}
      <div className="hidden md:block p-8">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Clients', href: `/${locale}/clients` }, { label: client.name }]} />
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          <div>
            <DocHero
              title={
                editing
                  ? <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input text-xl font-bold w-72" style={{ padding: '4px 8px' }} />
                  : (
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.name} size="xl" />
                      <span>{client.name}</span>
                    </div>
                  )
              }
              sub={`${locale === 'es' ? 'Cliente desde' : 'Client since'} ${new Date().getFullYear()} · ${jobs.length} ${jobs.length === 1 ? (locale === 'es' ? 'proyecto' : 'project') : (locale === 'es' ? 'proyectos' : 'projects')}${client.address ? ` · ${client.address}` : ''}`}
              actions={
                editing ? (
                  <>
                    <button onClick={handleSave} disabled={isPending} className="btn-primary btn-sm"><Check size={14} /> Save</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary btn-sm"><X size={14} /> Cancel</button>
                  </>
                ) : (
                  <>
                    <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm">
                      <Plus size={14} /> New estimate
                    </Link>
                    <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                      <Edit2 size={14} /> Edit
                    </button>
                  </>
                )
              }
            >
              <DocMeta k={locale === 'es' ? 'Proyectos' : 'Projects'} v={<>{jobs.length} <span style={{ color: 'var(--wp-text-3)', fontWeight: 400, fontSize: '0.7rem' }}>({activeJobs} active)</span></>} />
              <DocMeta k={locale === 'es' ? 'Facturado' : 'Total billed'} v={`$${formatCurrencyCompact(totalBilled)}`} />
              {outstanding > 0 && (
                <DocMeta k="Balance" v={
                  <span style={{ color: 'var(--wp-warning-v2)', fontWeight: 600 }}>${formatCurrencyCompact(outstanding)}</span>
                } />
              )}
              <DocMeta k={locale === 'es' ? 'Prom. proyecto' : 'Avg project'} v={jobs.length > 0 ? `$${formatCurrencyCompact(totalRevenue / jobs.length)}` : '—'} />
              <DocMeta
                className="ml-auto text-right"
                k="Lifetime value"
                v={`$${formatCurrencyCompact(totalRevenue)}`}
                total
              />
            </DocHero>

            {/* Contact info */}
            <div className="card p-5 mt-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--wp-text-3)' }}>Contact info</h2>
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium" style={{ color: 'var(--wp-text-2)' }}>Email</label>
                      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-medium" style={{ color: 'var(--wp-text-2)' }}>Phone</label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input mt-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--wp-text-2)' }}>Address</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={{ color: 'var(--wp-text-2)' }}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input mt-1 resize-none" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {client.email && (
                    <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-2)' }}>
                      <Mail size={14} style={{ color: 'var(--wp-text-3)' }} /> {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2" style={{ color: 'var(--wp-text-2)' }}>
                      <Phone size={14} style={{ color: 'var(--wp-text-3)' }} /> {client.phone}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2 col-span-2" style={{ color: 'var(--wp-text-2)' }}>
                      <MapPin size={14} style={{ color: 'var(--wp-text-3)' }} /> {client.address}
                    </div>
                  )}
                  {client.notes && (
                    <p className="col-span-2 italic mt-1" style={{ color: 'var(--wp-text-3)' }}>{client.notes}</p>
                  )}
                  {!client.email && !client.phone && !client.address && !client.notes && (
                    <p className="col-span-2" style={{ color: 'var(--wp-text-3)' }}>No contact info.</p>
                  )}
                </div>
              )}
            </div>

            {/* Jobs */}
            <div className="card mt-3 overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text)' }}>
                  <Briefcase size={14} style={{ color: 'var(--wp-text-3)' }} /> Jobs
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--wp-text-3)' }}>· {jobs.length}</span>
                </h2>
                <Link href={`/${locale}/projects/new?clientId=${client.id}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--wp-brand)' }}>
                  + New Job
                </Link>
              </div>
              {jobs.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: 'var(--wp-text-3)' }}>No jobs yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} className="hover:bg-[var(--wp-surface-2)] transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                        <td className="px-5 py-3">
                          <Link href={`/${locale}/projects/${j.id}`} className="font-medium hover:underline" style={{ color: 'var(--wp-text)' }}>{j.name}</Link>
                        </td>
                        <td className="px-5 py-3">
                          {(() => {
                            const derived = deriveJobStatus(j)
                            return <JobStatusBadge status={derived} label={derived.charAt(0).toUpperCase() + derived.slice(1)} />
                          })()}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--wp-text)' }}>
                          ${formatCurrency(j.budgetedCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Estimates */}
            <div className="card mt-3 overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text)' }}>
                  <FileText size={14} style={{ color: 'var(--wp-text-3)' }} /> Estimates
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--wp-text-3)' }}>· {estimates.length}</span>
                </h2>
                <Link href={`/${locale}/estimates/new`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--wp-brand)' }}>
                  + New Estimate
                </Link>
              </div>
              {estimates.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: 'var(--wp-text-3)' }}>No estimates yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {estimates.map(e => {
                      const linkedJob = e.jobId ? jobById.get(e.jobId) : null
                      return (
                        <tr key={e.id} className="hover:bg-[var(--wp-surface-2)] transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <Link href={`/${locale}/estimates/${e.id}`} className="font-medium font-mono text-xs hover:underline" style={{ color: 'var(--wp-text-2)' }}>{e.number}</Link>
                              {e.signatureDataUrl && <PenLine size={11} style={{ color: 'var(--wp-success-v2)' }} aria-label="Signed" />}
                              {e.depositPaid && <DollarSign size={11} style={{ color: 'var(--wp-success-v2)' }} aria-label="Deposit paid" />}
                              {e.contractId && <Paperclip size={11} style={{ color: 'var(--wp-text-3)' }} aria-label="Contract attached" />}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {(() => {
                              const derived = deriveEstimateStatus(e)
                              return <EstimateStatusBadge status={derived as EstimateStatus} label={derived.charAt(0).toUpperCase() + derived.slice(1)} />
                            })()}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {linkedJob ? (
                              <Link href={`/${locale}/projects/${linkedJob.id}`} className="hover:underline inline-flex items-center gap-1 truncate max-w-[180px]" style={{ color: 'var(--wp-brand)' }}>
                                <Briefcase size={11} />
                                <span className="truncate">{linkedJob.name}</span>
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--wp-text-3)' }}>—</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--wp-text)' }}>
                            ${formatCurrency(e.total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Invoices */}
            <div className="card mt-3 overflow-hidden" style={{ padding: 0 }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--wp-text)' }}>
                  <Receipt size={14} style={{ color: 'var(--wp-text-3)' }} /> Invoices
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--wp-text-3)' }}>· {invoices.length}</span>
                </h2>
              </div>
              {invoices.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: 'var(--wp-text-3)' }}>No invoices yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {invoices.map(i => {
                      const linkedJob = i.jobId ? jobById.get(i.jobId) : null
                      return (
                        <tr key={i.id} className="hover:bg-[var(--wp-surface-2)] transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                          <td className="px-5 py-3">
                            <Link href={`/${locale}/invoices/${i.id}`} className="font-medium font-mono text-xs hover:underline" style={{ color: 'var(--wp-text-2)' }}>{i.number}</Link>
                          </td>
                          <td className="px-5 py-3">
                            {(() => {
                              const d = deriveInvoiceStatus(i)
                              return (
                                <span className="text-xs" style={{ color: d === 'paid' ? 'var(--wp-success-v2)' : d === 'overdue' ? 'var(--wp-error-v2)' : 'var(--wp-text-3)' }}>
                                  {d}
                                </span>
                              )
                            })()}
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {linkedJob ? (
                              <Link href={`/${locale}/projects/${linkedJob.id}`} className="hover:underline inline-flex items-center gap-1 truncate max-w-[180px]" style={{ color: 'var(--wp-brand)' }}>
                                <Briefcase size={11} />
                                <span className="truncate">{linkedJob.name}</span>
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--wp-text-3)' }}>—</span>
                            )}
                          </td>
                          <td className="px-5 py-3" style={{ color: 'var(--wp-text-3)' }}>
                            {i.dueDate ? new Date(i.dueDate).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : '—'}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--wp-text)' }}>
                            ${formatCurrency(i.total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <DetailSidebar>
            <TotalsCard
              label={locale === 'es' ? 'Resumen de cuenta' : 'Account summary'}
              total={`$${formatCurrencyCompact(totalRevenue + outstanding)}`}
              rows={[
                { k: locale === 'es' ? 'Pagado' : 'Paid', v: `$${formatCurrencyCompact(totalRevenue)}` },
                ...(outstanding > 0 ? [{ k: locale === 'es' ? 'Pendiente' : 'Outstanding', v: `$${formatCurrencyCompact(outstanding)}`, emphasis: true }] : []),
                ...(activeJobs > 0 ? [{ k: locale === 'es' ? 'En progreso' : 'In progress', v: `${activeJobs} ${locale === 'es' ? 'proyectos' : 'projects'}` }] : []),
              ]}
            />

            <SideCard label={locale === 'es' ? 'Contacto' : 'Contact'}>
              {client.email && (
                <p className="text-xs mb-1" style={{ color: 'var(--wp-text-2)' }}>{client.email}</p>
              )}
              {client.phone && (
                <p className="text-xs mb-1" style={{ color: 'var(--wp-text-2)' }}>{client.phone}</p>
              )}
              {client.address && (
                <p className="text-xs mb-2" style={{ color: 'var(--wp-text-3)' }}>{client.address}</p>
              )}
              <div className="flex gap-1.5 mt-2">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex-1 btn-secondary btn-sm justify-center" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem' }}>
                    <PhoneCall size={12} /> Call
                  </a>
                )}
                {client.phone && (
                  <a href={`sms:${client.phone}`} className="flex-1 btn-secondary btn-sm justify-center" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem' }}>
                    <Phone size={12} /> SMS
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex-1 btn-secondary btn-sm justify-center" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem' }}>
                    <Mail size={12} /> Email
                  </a>
                )}
              </div>
            </SideCard>

            {client.address && (
              <SideCard label="Address">
                <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                  <MapPin size={13} style={{ color: 'var(--wp-text-3)', marginTop: 1, flexShrink: 0 }} />
                  <span>{client.address}</span>
                </div>
              </SideCard>
            )}

            {client.notes && (
              <SideCard label="Notes">
                <p className="text-xs italic" style={{ color: 'var(--wp-text-2)', lineHeight: 1.5 }}>{client.notes}</p>
              </SideCard>
            )}

            <SideCard label="Tags">
              <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Sin tags' : 'No tags'}</p>
            </SideCard>
          </DetailSidebar>
        </div>
      </div>
    </>
  )
}
