'use client'

import { useState, useTransition, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteEstimate } from '@/lib/actions/estimates'
import { generateEstimateShareToken } from '@/lib/actions/portal'
import { getTemplates } from '@/lib/actions/templates'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { FileText, Plus, Trash2, Share2, Check, FileStack, Mail, MailOpen, ChevronDown } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | 'expired'
type Estimate = { id: string; number: string; clientName: string; status: string; total: string; createdAt: Date }
type T = { title: string; new: string; empty: string; status: Record<EstimateStatus, string>; fields: { number: string; clientName: string; total: string } }

const ALL_STATUSES: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted', 'expired']

export function EstimatesClient({ initialEstimates, viewCounts = {}, planInfo, translations: t }: { initialEstimates: Estimate[]; viewCounts?: Record<string, number>; planInfo: { current: number; limit: number } | null; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<EstimateStatus | 'all'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [showDrafts, setShowDrafts] = useState(false)

  useEffect(() => { getTemplates().then(setTemplates) }, [])

  // Metrics for bars
  const drafts = initialEstimates.filter(e => e.status === 'draft')
  const pending = initialEstimates.filter(e => e.status === 'sent')
  const approved = initialEstimates.filter(e => e.status === 'approved' || e.status === 'converted')
  const declined = initialEstimates.filter(e => e.status === 'rejected')
  const pendingOpened = pending.filter(e => (viewCounts[e.id] ?? 0) > 0).length
  const pendingNotOpened = pending.length - pendingOpened
  const approvedInvoiced = initialEstimates.filter(e => e.status === 'converted').length
  const approvedNotInvoiced = initialEstimates.filter(e => e.status === 'approved').length

  async function handleShare(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const url = await generateEstimateShareToken(id)
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const visible = initialEstimates
    .filter(e => {
      if (e.status === 'draft') return false // Drafts shown separately
      const matchesSearch = e.clientName.toLowerCase().includes(search.toLowerCase()) || e.number.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === 'all'
        || (filter === 'sent' && e.status === 'sent')
        || (filter === 'approved' && (e.status === 'approved' || e.status === 'converted'))
        || (filter === 'rejected' && e.status === 'rejected')
        || e.status === filter
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Group by month/year
  const grouped = visible.reduce<Record<string, Estimate[]>>((acc, est) => {
    const key = new Date(est.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(est)
    return acc
  }, {})
  const monthKeys = Object.keys(grouped)

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteEstimate(deleteId); router.refresh() })
    setDeleteId(null)
  }

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full">
      {deleteId && (
        <ConfirmModal
          title="Delete Estimate"
          message="Are you sure you want to delete this estimate? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {planInfo && <PlanLimitBanner current={planInfo.current} limit={planInfo.limit} resource="estimates" />}

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">{t.title}</h1>
        <div className="flex items-center gap-2 relative">
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn-secondary btn-sm">
            <FileStack size={14} /> Use Template
          </button>
          {showTemplates && templates.length > 0 && (
            <div className="absolute z-20 right-0 top-full mt-1 w-64 card" style={{ boxShadow: 'var(--wp-shadow-lg)' }}>
              <div className="px-3 py-2 text-xs font-medium border-b" style={{ color: 'var(--wp-text-muted)', borderColor: 'var(--wp-border-light)' }}>Templates</div>
              {templates.map(tmpl => (
                <button key={tmpl.id} onClick={() => { router.push(`/${locale}/estimates/new?templateId=${tmpl.id}`); setShowTemplates(false) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--wp-bg-muted)]" style={{ color: 'var(--wp-text-secondary)', borderBottom: '1px solid var(--wp-border-light)' }}>
                  {tmpl.name}
                </button>
              ))}
            </div>
          )}
          {showTemplates && templates.length === 0 && (
            <div className="absolute z-20 right-0 top-full mt-1 w-64 card p-3" style={{ boxShadow: 'var(--wp-shadow-lg)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--wp-text-muted)' }}>No templates yet.</p>
            </div>
          )}
          <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
        </div>
      </div>

      {/* Search — compact */}
      <div className="mb-3">
        <input type="text"
          placeholder={locale === 'es' ? 'Buscar presupuestos' : 'Search all estimates'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-primary)' }}
        />
      </div>

      {/* Filters — Pending | Approved | Declined with counts */}
      <div className="tab-bar mb-1 md:hidden">
        {([
          { key: 'sent', label: locale === 'es' ? 'Pendiente' : 'Pending', count: pending.length },
          { key: 'approved', label: locale === 'es' ? 'Aprobado' : 'Approved', count: approved.length },
          { key: 'rejected', label: locale === 'es' ? 'Rechazado' : 'Declined', count: declined.length },
        ] as { key: EstimateStatus; label: string; count: number }[]).map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`tab-bar-item ${filter === key ? 'tab-bar-item-active' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Desktop: pill filters with counters */}
      <div className="hidden md:flex tab-pills mb-1">
        <button onClick={() => setFilter('all')} className={`tab-pill ${filter === 'all' ? 'tab-pill-active' : ''}`}>All <span className="ml-1 opacity-60">{initialEstimates.length}</span></button>
        {ALL_STATUSES.map(s => {
          const count = initialEstimates.filter(e => e.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setFilter(s)} className={`tab-pill ${filter === s ? 'tab-pill-active' : ''}`}>
              {t.status[s]} <span className="ml-1 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Context bar — changes based on active filter ───── */}
      {initialEstimates.length > 0 && (
        <div className="mb-4 mt-2">
          {filter === 'sent' || (filter === 'all' && false) ? (
            /* Pending: opened vs not opened */
            pending.length > 0 ? (
              <div>
                <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
                  <div style={{ width: `${pending.length > 0 ? (pendingOpened / pending.length) * 100 : 0}%`, background: '#059669', transition: 'width 0.5s ease' }} />
                </div>
                <p className="mt-1.5" style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>
                  {pendingOpened} of {pending.length} opened by client
                </p>
              </div>
            ) : null
          ) : filter === 'approved' ? (
            /* Approved: invoiced vs not */
            approved.length > 0 ? (
              <div>
                <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
                  <div style={{ width: `${(approvedInvoiced / approved.length) * 100}%`, background: '#7C3AED', transition: 'width 0.5s ease' }} />
                </div>
                <p className="mt-1.5" style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>
                  {approvedInvoiced} of {approved.length} invoiced
                </p>
              </div>
            ) : null
          ) : filter === 'rejected' ? (
            /* Declined: just count */
            <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>
              {declined.length} declined
            </p>
          ) : null}
        </div>
      )}

      {/* ── Insight — stale estimates ───────────────────────── */}
      {(() => {
        const stale = initialEstimates.filter(e => e.status === 'sent' && Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 86400000) > 3)
        if (stale.length === 0) return null
        return (
          <div className="mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--wp-warning-bg)', borderLeft: '3px solid var(--wp-warning)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--wp-warning)', flex: 1 }}>
              <strong>{stale.length}</strong> pending 3+ days
            </span>
            <button onClick={() => setFilter('sent')} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wp-warning)' }}>View</button>
          </div>
        )
      })()}

      {/* ── Drafts — collapsible section ────────────────────── */}
      {drafts.length > 0 && filter === 'all' && (
        <div className="mb-3">
          <button onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left"
            style={{ background: 'var(--wp-bg-muted)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--wp-text-secondary)' }}>
            <ChevronDown size={14} className={`transition-transform ${showDrafts ? 'rotate-0' : '-rotate-90'}`} />
            Drafts ({drafts.length})
          </button>
          {showDrafts && (
            <div className="mt-1">
              {drafts.map(est => (
                <div key={est.id} className="flex items-center justify-between py-2.5 px-3"
                  style={{ borderBottom: '1px solid var(--wp-border-light)', fontSize: '0.8125rem' }}>
                  <div className="cursor-pointer flex-1 min-w-0"
                    onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                    onMouseEnter={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                    onTouchStart={() => router.prefetch(`/${locale}/estimates/${est.id}`)}>
                    <span style={{ color: 'var(--wp-text-secondary)' }}>{est.clientName} · {est.number}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-price" style={{ color: 'var(--wp-text-muted)' }}>${parseFloat(est.total).toFixed(2)}</span>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(est.id) }}
                      className="p-1.5 rounded-md hover:bg-red-50" style={{ color: 'var(--wp-text-muted)' }}
                      aria-label="Delete draft">
                      <Trash2 size={14} className="hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty states */}
      {initialEstimates.length === 0 ? (
        <div className="card empty-state">
          <FileText size={36} className="empty-state-icon" />
          <p className="empty-state-text">{t.empty}</p>
          <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center" style={{ color: 'var(--wp-text-muted)', fontSize: '0.875rem' }}>
          {locale === 'es' ? 'Sin resultados.' : 'No estimates match your search.'}
        </div>
      ) : (
        <>
          {/* ── Mobile list ─────────────────────────────────────── */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              const monthTotal = items.reduce((s, e) => s + parseFloat(e.total), 0)
              return (
                <div key={month}>
                  {/* Month header — shaded */}
                  <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text-primary)', letterSpacing: '0.01em' }}>{month}</span>
                    <span className="text-price" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-primary)' }}>${monthTotal.toFixed(2)}</span>
                  </div>

                  {/* Estimate rows — staggered fade in + swipe actions */}
                  {items.map((est, idx) => (
                    <SwipeableRow
                      key={est.id}
                      actions={[
                        { label: 'Share', icon: <Share2 size={16} />, color: 'white', bg: 'var(--wp-primary)', onClick: () => handleShare({} as any, est.id) },
                        { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error)', onClick: () => setDeleteId(est.id) },
                      ]}
                    >
                      <div onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                        onTouchStart={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                        className="cursor-pointer active:bg-[var(--wp-bg-muted)]"
                        style={{
                          padding: '0.75rem 0',
                          borderBottom: '1px solid var(--wp-border-light)',
                          animation: `fadeSlideIn 0.3s ease both`,
                          animationDelay: `${idx * 30}ms`,
                        }}>
                        {/* Row 1: Name — Amount */}
                        <div className="flex items-baseline justify-between">
                          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text-primary)' }}>{est.clientName}</span>
                          <span className="text-price" style={{ fontSize: '0.9375rem', color: 'var(--wp-text-primary)' }}>${parseFloat(est.total).toFixed(2)}</span>
                        </div>
                        {/* Row 2: Date · #number — mail icon + badge */}
                        <div className="flex items-center justify-between mt-1">
                          <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>
                            {new Date(est.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · #{est.number.replace('EST-', '')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {est.status === 'sent' && (
                              (viewCounts[est.id] ?? 0) > 0
                                ? <MailOpen size={12} style={{ color: 'var(--wp-success)' }} />
                                : <Mail size={12} style={{ color: 'var(--wp-text-muted)' }} />
                            )}
                            <EstimateStatusBadge status={est.status as EstimateStatus} label={t.status[est.status as EstimateStatus] ?? est.status} />
                          </div>
                        </div>
                      </div>
                    </SwipeableRow>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className={`hidden md:block card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[560px]">
                <thead style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.number}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.clientName}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.total}</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map(month => {
                    const items = grouped[month]
                    const monthTotal = items.reduce((s, e) => s + parseFloat(e.total), 0)
                    return (
                      <Fragment key={month}>
                        <tr style={{ background: 'var(--wp-bg-muted)' }}>
                          <td colSpan={5} className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <span className="month-header-title">{month}</span>
                              <span className="month-header-total">${monthTotal.toFixed(2)}</span>
                            </div>
                          </td>
                          <td />
                        </tr>
                        {items.map(est => (
                          <tr key={est.id} onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                            onMouseEnter={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                            className="cursor-pointer hover:bg-[var(--wp-bg-muted)] transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--wp-text-primary)' }}>{est.number}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--wp-text-secondary)' }}>{est.clientName}</td>
                            <td className="px-4 py-3"><EstimateStatusBadge status={est.status as EstimateStatus} label={t.status[est.status as EstimateStatus] ?? est.status} /></td>
                            <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>{new Date(est.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-price" style={{ color: 'var(--wp-text-primary)' }}>${parseFloat(est.total).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={e => handleShare(e, est.id)} className="btn-ghost p-1.5" style={{ minHeight: 'auto' }} aria-label="Share estimate">
                                  {copiedId === est.id ? <Check size={14} style={{ color: 'var(--wp-success)' }} /> : <Share2 size={14} />}
                                </button>
                                <button onClick={e => { e.stopPropagation(); setDeleteId(est.id) }} className="btn-ghost p-1.5 hover:!text-red-500" style={{ minHeight: 'auto' }} aria-label="Delete estimate"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
