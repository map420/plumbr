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
import { FileText, Plus, Trash2, Share2, Check, FileStack, Mail, MailOpen, ChevronDown, AlertTriangle } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'
import {
  StatusPill, KpiCard, ClientAvatar, Segmented, Toolbar, EmptyState,
  type StatusTone,
} from '@/components/ui'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | 'expired'
type Estimate = { id: string; number: string; clientName: string; clientEmail?: string | null; status: string; total: string; createdAt: Date }
type T = { title: string; new: string; empty: string; status: Record<EstimateStatus, string>; fields: { number: string; clientName: string; total: string } }

type FilterValue = 'all' | EstimateStatus

// Map estimate status → visual tone for StatusPill and dots
const STATUS_TONE: Record<EstimateStatus, StatusTone> = {
  draft: 'draft',
  sent: 'sent',
  approved: 'approved',
  rejected: 'rejected',
  converted: 'converted',
  expired: 'warning',
}

const DESKTOP_FILTERS: readonly EstimateStatus[] = ['sent', 'approved', 'rejected', 'converted', 'expired']

export function EstimatesClient({ initialEstimates, viewCounts = {}, planInfo, translations: t }: { initialEstimates: Estimate[]; viewCounts?: Record<string, number>; planInfo: { current: number; limit: number } | null; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [showDrafts, setShowDrafts] = useState(false)

  useEffect(() => { getTemplates().then(setTemplates) }, [])

  // Metrics
  const drafts = initialEstimates.filter(e => e.status === 'draft')
  const pending = initialEstimates.filter(e => e.status === 'sent')
  const approved = initialEstimates.filter(e => e.status === 'approved' || e.status === 'converted')
  const declined = initialEstimates.filter(e => e.status === 'rejected')
  const pendingOpened = pending.filter(e => (viewCounts[e.id] ?? 0) > 0).length
  const approvedInvoiced = initialEstimates.filter(e => e.status === 'converted').length
  const totalApprovedValue = approved.reduce((s, e) => s + parseFloat(e.total), 0)
  const totalPendingValue = pending.reduce((s, e) => s + parseFloat(e.total), 0)
  const totalDeclinedValue = declined.reduce((s, e) => s + parseFloat(e.total), 0)

  // Stale estimates (pending 3+ days)
  const stale = initialEstimates.filter(e =>
    e.status === 'sent' &&
    Math.floor((Date.now() - new Date(e.createdAt).getTime()) / 86400000) > 3,
  )

  async function handleShare(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const url = await generateEstimateShareToken(id)
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const visible = initialEstimates
    .filter(e => {
      if (e.status === 'draft') return false // Drafts shown in collapsible section
      const q = search.toLowerCase()
      const matchesSearch = e.clientName.toLowerCase().includes(q) || e.number.toLowerCase().includes(q)
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

  // Build segmented options with live counts (desktop & mobile)
  const desktopFilterOptions = [
    { value: 'all' as FilterValue, label: 'All', count: initialEstimates.length - drafts.length },
    ...DESKTOP_FILTERS
      .filter(s => initialEstimates.some(e => e.status === s))
      .map(s => ({
        value: s as FilterValue,
        label: t.status[s],
        count: initialEstimates.filter(e => e.status === s).length,
      })),
  ]

  const mobileFilterOptions = [
    { value: 'sent' as FilterValue, label: locale === 'es' ? 'Pendiente' : 'Pending', count: pending.length },
    { value: 'approved' as FilterValue, label: locale === 'es' ? 'Aprobado' : 'Approved', count: approved.length },
    { value: 'rejected' as FilterValue, label: locale === 'es' ? 'Rechazado' : 'Declined', count: declined.length },
  ]

  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`

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

      {/* ── Desktop header ─────────────────────────────── */}
      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">{t.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {initialEstimates.length} {locale === 'es' ? 'total' : 'total'}
            {approved.length > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-success-v2)', fontWeight: 500 }}>
                  {formatCurrency(totalApprovedValue)}
                </span>
                {' '}
                {locale === 'es' ? 'aprobado' : 'approved'}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 relative">
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn-secondary btn-sm">
            <FileStack size={14} /> {locale === 'es' ? 'Plantilla' : 'Template'}
          </button>
          {showTemplates && templates.length > 0 && (
            <div className="absolute z-20 right-0 top-full mt-1 w-64 card" style={{ boxShadow: 'var(--wp-elevation-3)' }}>
              <div className="px-3 py-2 text-xs font-medium border-b" style={{ color: 'var(--wp-text-3)', borderColor: 'var(--wp-border-v2)' }}>Templates</div>
              {templates.map(tmpl => (
                <button key={tmpl.id} onClick={() => { router.push(`/${locale}/estimates/new?templateId=${tmpl.id}`); setShowTemplates(false) }}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--wp-surface-2)]" style={{ color: 'var(--wp-text-2)', borderBottom: '1px solid var(--wp-border-light)' }}>
                  {tmpl.name}
                </button>
              ))}
            </div>
          )}
          {showTemplates && templates.length === 0 && (
            <div className="absolute z-20 right-0 top-full mt-1 w-64 card p-3" style={{ boxShadow: 'var(--wp-elevation-3)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--wp-text-3)' }}>No templates yet.</p>
            </div>
          )}
          <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
        </div>
      </div>

      {/* ── Desktop KPI row (new in v2) ────────────────── */}
      {initialEstimates.length > 0 && (
        <div className="hidden md:grid grid-cols-4 gap-2.5 mb-5">
          <KpiCard
            tone="info"
            label={locale === 'es' ? 'Pendientes' : 'Pending'}
            value={pending.length}
            sub={pending.length > 0 ? `${formatCurrency(totalPendingValue)} · ${pendingOpened} ${locale === 'es' ? 'visto' : 'opened'}` : undefined}
          />
          <KpiCard
            tone="success"
            label={locale === 'es' ? 'Aprobados' : 'Approved'}
            value={approved.length}
            sub={approved.length > 0 ? `${formatCurrency(totalApprovedValue)} · ${approvedInvoiced} ${locale === 'es' ? 'facturados' : 'invoiced'}` : undefined}
            subTone={approved.length > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            tone="danger"
            label={locale === 'es' ? 'Rechazados' : 'Declined'}
            value={declined.length}
            sub={declined.length > 0 ? formatCurrency(totalDeclinedValue) : undefined}
          />
          <KpiCard
            tone="brand"
            label={locale === 'es' ? 'Borradores' : 'Drafts'}
            value={drafts.length}
            sub={drafts.length > 0 ? (locale === 'es' ? 'Sin enviar' : 'Not sent') : undefined}
          />
        </div>
      )}

      {/* ── Stale estimates insight ────────────────────── */}
      {stale.length > 0 && (
        <div
          className="mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--wp-warning-bg-v2)', border: '1px solid var(--wp-warning-border)' }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--wp-warning-v2)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--wp-warning-v2)', flex: 1 }}>
            <strong>{stale.length}</strong>{' '}
            {locale === 'es'
              ? (stale.length === 1 ? 'pendiente 3+ días' : 'pendientes 3+ días')
              : (stale.length === 1 ? 'pending 3+ days' : 'pending 3+ days')}
          </span>
          <button
            onClick={() => setFilter('sent')}
            className="text-xs font-bold px-2.5 py-1 rounded-md"
            style={{ background: 'white', color: 'var(--wp-warning-v2)', border: '1px solid var(--wp-warning-border)' }}
          >
            {locale === 'es' ? 'Ver' : 'View'}
          </button>
        </div>
      )}

      {/* ── Mobile: search + segmented ──────────────────── */}
      <div className="md:hidden">
        <input
          type="text"
          placeholder={locale === 'es' ? 'Buscar presupuestos' : 'Search all estimates'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
          style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text)' }}
        />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={mobileFilterOptions}
          className="mb-3"
        />
      </div>

      {/* ── Desktop: toolbar (search + segmented) ──────── */}
      <div className="hidden md:block">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={locale === 'es' ? 'Buscar por cliente, número o estado...' : 'Search by client, number or status...'}
          right={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={desktopFilterOptions}
            />
          }
        />
      </div>

      {/* ── Drafts collapsible ─────────────────────────── */}
      {drafts.length > 0 && filter === 'all' && (
        <div className="mb-3">
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-left hover:border-[color:var(--wp-border-hover)] transition-colors"
            style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--wp-text)' }}
          >
            <ChevronDown size={14} className={`transition-transform ${showDrafts ? 'rotate-0' : '-rotate-90'}`} style={{ color: 'var(--wp-text-3)' }} />
            <span>{locale === 'es' ? 'Borradores' : 'Drafts'}</span>
            <span className="wp-pill wp-pill--draft ml-auto">
              <span className="wp-pill-dot" />
              {drafts.length}
            </span>
          </button>
          {showDrafts && (
            <div className="mt-1">
              {drafts.map(est => (
                <div key={est.id} className="flex items-center justify-between py-2.5 px-3"
                  style={{ borderBottom: '1px solid var(--wp-border-light)', fontSize: '0.8125rem' }}>
                  <div className="cursor-pointer flex-1 min-w-0 flex items-center gap-2.5"
                    onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                    onMouseEnter={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                    onTouchStart={() => router.prefetch(`/${locale}/estimates/${est.id}`)}>
                    <ClientAvatar name={est.clientName} size="sm" />
                    <span style={{ color: 'var(--wp-text-2)' }}>{est.clientName} · {est.number}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-price" style={{ color: 'var(--wp-text-3)' }}>${parseFloat(est.total).toFixed(2)}</span>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(est.id) }}
                      className="p-1.5 rounded-md hover:bg-red-50" style={{ color: 'var(--wp-text-3)' }}
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

      {/* ── Empty states ───────────────────────────────── */}
      {initialEstimates.length === 0 ? (
        <EmptyState
          icon={<FileText size={36} />}
          title={t.empty}
          cta={
            <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm">
              <Plus size={14} /> {t.new}
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <div className="py-12 text-center" style={{ color: 'var(--wp-text-3)', fontSize: '0.875rem' }}>
          {locale === 'es' ? 'Sin resultados.' : 'No estimates match your search.'}
        </div>
      ) : (
        <>
          {/* ── Mobile list ────────────────────────── */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              const monthTotal = items.reduce((s, e) => s + parseFloat(e.total), 0)
              return (
                <div key={month}>
                  <div
                    className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}
                  >
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text)', letterSpacing: '0.01em' }}>{month}</span>
                    <span className="text-price" style={{ fontSize: '0.8125rem', color: 'var(--wp-text)' }}>${monthTotal.toFixed(2)}</span>
                  </div>

                  {items.map((est, idx) => (
                    <SwipeableRow
                      key={est.id}
                      actions={[
                        { label: 'Share', icon: <Share2 size={16} />, color: 'white', bg: 'var(--wp-brand)', onClick: () => handleShare({} as React.MouseEvent, est.id) },
                        { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error-v2)', onClick: () => setDeleteId(est.id) },
                      ]}
                    >
                      <div
                        onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                        onTouchStart={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                        className="cursor-pointer active:bg-[var(--wp-surface-2)] flex gap-3 items-start"
                        style={{
                          padding: '0.75rem 0',
                          borderBottom: '1px solid var(--wp-border-light)',
                          animation: `fadeSlideIn 0.3s ease both`,
                          animationDelay: `${idx * 30}ms`,
                        }}
                      >
                        <ClientAvatar name={est.clientName} size="md" className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between">
                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text)' }}>{est.clientName}</span>
                            <span className="text-price" style={{ fontSize: '0.9375rem', color: 'var(--wp-text)' }}>${parseFloat(est.total).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>
                              {new Date(est.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · #{est.number.replace('EST-', '')}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {est.status === 'sent' && (
                                (viewCounts[est.id] ?? 0) > 0
                                  ? <MailOpen size={12} style={{ color: 'var(--wp-success-v2)' }} />
                                  : <Mail size={12} style={{ color: 'var(--wp-text-3)' }} />
                              )}
                              <EstimateStatusBadge status={est.status as EstimateStatus} label={t.status[est.status as EstimateStatus] ?? est.status} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </SwipeableRow>
                  ))}
                </div>
              )
            })}
          </div>

          {/* ── Desktop table ──────────────────────── */}
          <div
            className={`hidden md:block ${isPending ? 'opacity-50' : ''}`}
            style={{
              background: 'var(--wp-surface)',
              border: '1px solid var(--wp-border-v2)',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[640px]">
                <thead style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.number}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.clientName}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.total}</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map(month => {
                    const items = grouped[month]
                    const monthTotal = items.reduce((s, e) => s + parseFloat(e.total), 0)
                    return (
                      <Fragment key={month}>
                        <tr style={{ background: 'var(--wp-surface-2)' }}>
                          <td colSpan={5} className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-2)' }}>
                                {month}
                                <span className="ml-2 font-normal" style={{ color: 'var(--wp-text-3)' }}>· {items.length}</span>
                              </span>
                              <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${monthTotal.toFixed(2)}</span>
                            </div>
                          </td>
                          <td />
                        </tr>
                        {items.map(est => {
                          const openedCount = viewCounts[est.id] ?? 0
                          return (
                            <tr
                              key={est.id}
                              onClick={() => router.push(`/${locale}/estimates/${est.id}`)}
                              onMouseEnter={() => router.prefetch(`/${locale}/estimates/${est.id}`)}
                              className="group cursor-pointer hover:bg-[var(--wp-surface-2)] transition-colors"
                              style={{ borderBottom: '1px solid var(--wp-border-light)' }}
                            >
                              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--wp-text-2)' }}>
                                #{est.number.replace('EST-', '')}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <ClientAvatar name={est.clientName} size="md" />
                                  <div className="min-w-0">
                                    <div style={{ color: 'var(--wp-text)', fontWeight: 500 }}>{est.clientName}</div>
                                    {est.clientEmail && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--wp-text-3)', marginTop: '1px' }}>{est.clientEmail}</div>
                                    )}
                                    {est.status === 'sent' && openedCount > 0 && (
                                      <div style={{ fontSize: '0.6875rem', color: 'var(--wp-success-v2)', marginTop: '1px' }}>
                                        ● {locale === 'es' ? `Visto ${openedCount}×` : `Opened ${openedCount}×`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusPill tone={STATUS_TONE[est.status as EstimateStatus] ?? 'neutral'}>
                                  {t.status[est.status as EstimateStatus] ?? est.status}
                                </StatusPill>
                              </td>
                              <td className="px-4 py-3" style={{ color: 'var(--wp-text-2)' }}>
                                {new Date(est.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-right text-price tabular-nums" style={{ color: 'var(--wp-text)' }}>
                                ${parseFloat(est.total).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={e => handleShare(e, est.id)}
                                    className="btn-ghost p-1.5"
                                    style={{ minHeight: 'auto' }}
                                    aria-label="Share estimate"
                                  >
                                    {copiedId === est.id
                                      ? <Check size={14} style={{ color: 'var(--wp-success-v2)' }} />
                                      : <Share2 size={14} />}
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setDeleteId(est.id) }}
                                    className="btn-ghost p-1.5 hover:!text-red-500"
                                    style={{ minHeight: 'auto' }}
                                    aria-label="Delete estimate"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
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
