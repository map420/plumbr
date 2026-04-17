'use client'

import { useState, useTransition, Fragment } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updateInvoice } from '@/lib/actions/invoices'
import { generateInvoiceShareToken } from '@/lib/actions/portal'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Receipt, Plus, Share2, Check, AlertTriangle } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'
import {
  StatusPill, KpiCard, ClientAvatar, Segmented, Toolbar, EmptyState,
  type StatusTone,
} from '@/components/ui'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
type Invoice = { id: string; number: string; clientName: string; status: string; dueDate: Date | null; total: string; paidAt: Date | null }
type T = { title: string; new: string; empty: string; markAsPaid: string; status: Record<InvoiceStatus, string>; fields: { number: string; clientName: string; dueDate: string; total: string } }

type FilterValue = 'all' | InvoiceStatus

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: 'draft',
  sent: 'sent',
  paid: 'paid',
  overdue: 'overdue',
  cancelled: 'declined',
}

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
  return inv.status as InvoiceStatus
}

export function InvoicesClient({ initialInvoices, translations: t }: { initialInvoices: Invoice[]; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleShare(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const url = await generateInvoiceShareToken(id)
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => { await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() }); router.refresh() })
  }

  const filteredInvoices = initialInvoices
    .filter(inv => {
      const st = effectiveStatus(inv)
      const matchesFilter = filter === 'all' ? st !== 'paid' && st !== 'cancelled' : st === filter
      const matchesSearch = !search ||
        inv.number.toLowerCase().includes(search.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
    .sort((a, b) => new Date(b.dueDate ?? b.paidAt ?? 0).getTime() - new Date(a.dueDate ?? a.paidAt ?? 0).getTime())

  // KPI metrics
  const overdue = initialInvoices.filter(inv => effectiveStatus(inv) === 'overdue')
  const outstanding = initialInvoices.filter(inv => { const s = effectiveStatus(inv); return s === 'sent' || s === 'overdue' })
  const paidCount = initialInvoices.filter(inv => effectiveStatus(inv) === 'paid').length
  const paidMonthStart = new Date()
  paidMonthStart.setDate(1); paidMonthStart.setHours(0, 0, 0, 0)
  const paidMTD = initialInvoices.filter(inv => {
    return effectiveStatus(inv) === 'paid' && inv.paidAt && new Date(inv.paidAt) >= paidMonthStart
  })
  const outstandingTotal = outstanding.reduce((s, i) => s + parseFloat(i.total), 0)
  const overdueTotal = overdue.reduce((s, i) => s + parseFloat(i.total), 0)
  const paidMTDTotal = paidMTD.reduce((s, i) => s + parseFloat(i.total), 0)

  // Group by month/year
  const grouped = filteredInvoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    const dateRef = inv.dueDate ?? inv.paidAt ?? new Date()
    const key = new Date(dateRef).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(inv)
    return acc
  }, {})
  const monthKeys = Object.keys(grouped)

  const formatCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`

  // Segmented options
  const desktopFilterOptions = [
    { value: 'all' as FilterValue, label: locale === 'es' ? 'Activas' : 'Active', count: outstanding.length },
    ...(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const)
      .filter(s => initialInvoices.some(i => i.status === s) || (s === 'overdue' && overdue.length > 0))
      .map(s => ({
        value: s as FilterValue,
        label: t.status[s],
        count: s === 'overdue' ? overdue.length : initialInvoices.filter(i => i.status === s).length,
      })),
  ]

  const mobileFilterOptions = [
    { value: 'all' as FilterValue, label: locale === 'es' ? 'Activas' : 'Active', count: outstanding.length },
    { value: 'sent' as FilterValue, label: locale === 'es' ? 'Enviadas' : 'Sent', count: initialInvoices.filter(i => i.status === 'sent').length },
    { value: 'paid' as FilterValue, label: locale === 'es' ? 'Pagadas' : 'Paid', count: paidCount },
    { value: 'overdue' as FilterValue, label: locale === 'es' ? 'Vencidas' : 'Overdue', count: overdue.length },
  ]

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full">
      {/* ── Desktop header ─────────────────────────────── */}
      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">{t.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {initialInvoices.length} {locale === 'es' ? 'total' : 'total'}
            {paidMTDTotal > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-success-v2)', fontWeight: 500 }}>
                  {formatCurrency(paidMTDTotal)}
                </span>
                {' '}
                {locale === 'es' ? 'cobrado este mes' : 'paid MTD'}
              </>
            )}
            {outstandingTotal > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-warning-v2)', fontWeight: 500 }}>
                  {formatCurrency(outstandingTotal)}
                </span>
                {' '}
                {locale === 'es' ? 'por cobrar' : 'outstanding'}
              </>
            )}
          </p>
        </div>
        <Link href={`/${locale}/invoices/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
      </div>

      {/* ── Desktop KPI row (new) ──────────────────────── */}
      {initialInvoices.length > 0 && (
        <div className="hidden md:grid grid-cols-4 gap-2.5 mb-5">
          <KpiCard
            tone="success"
            label={locale === 'es' ? 'Cobrado este mes' : 'Paid MTD'}
            value={formatCurrency(paidMTDTotal)}
            sub={paidMTD.length > 0 ? `${paidMTD.length} ${locale === 'es' ? 'facturas' : 'invoices'}` : undefined}
            subTone={paidMTD.length > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            tone="warning"
            label={locale === 'es' ? 'Por cobrar' : 'Outstanding'}
            value={formatCurrency(outstandingTotal)}
            sub={`${outstanding.length} ${locale === 'es' ? 'abiertas' : 'open'}`}
          />
          <KpiCard
            tone="danger"
            label={locale === 'es' ? 'Vencidas' : 'Overdue'}
            value={formatCurrency(overdueTotal)}
            sub={overdue.length > 0 ? `${overdue.length} ${locale === 'es' ? 'facturas' : 'invoices'}` : (locale === 'es' ? 'Ninguna ✓' : 'None ✓')}
          />
          <KpiCard
            tone="info"
            label={locale === 'es' ? 'Total pagadas' : 'Paid all-time'}
            value={paidCount}
            sub={outstanding.length + paidCount > 0 ? `${Math.round((paidCount / (paidCount + outstanding.length)) * 100)}% ${locale === 'es' ? 'tasa' : 'rate'}` : undefined}
          />
        </div>
      )}

      {/* ── Overdue banner ─────────────────────────────── */}
      {overdue.length > 0 && filter === 'all' && (
        <div
          className="mb-4 flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--wp-error-bg-v2)', border: '1px solid var(--wp-error-border)' }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--wp-error-v2)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem', color: 'var(--wp-error-v2)', flex: 1 }}>
            <strong>{overdue.length}</strong>{' '}
            {locale === 'es' ? 'vencida(s)' : 'overdue'}
            {' · '}
            {formatCurrency(overdueTotal)}
          </span>
          <button
            onClick={() => setFilter('overdue')}
            className="text-xs font-bold px-2.5 py-1 rounded-md"
            style={{ background: 'white', color: 'var(--wp-error-v2)', border: '1px solid var(--wp-error-border)' }}
          >
            {locale === 'es' ? 'Ver' : 'View'}
          </button>
        </div>
      )}

      {/* ── Mobile: search + segmented ──────────────────── */}
      <div className="md:hidden">
        <input type="text"
          placeholder={locale === 'es' ? 'Buscar facturas' : 'Search all invoices'}
          value={search} onChange={e => setSearch(e.target.value)}
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

      {/* ── Desktop: toolbar ───────────────────────────── */}
      <div className="hidden md:block">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={locale === 'es' ? 'Buscar por cliente o número...' : 'Search by client or number...'}
          right={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={desktopFilterOptions}
            />
          }
        />
      </div>

      {/* ── Empty state ────────────────────────────────── */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={<Receipt size={36} />}
          title={filter === 'all' ? t.empty : `No ${filter} invoices.`}
          cta={
            <Link href={`/${locale}/invoices/new`} className="btn-primary btn-sm">
              <Plus size={14} /> {t.new}
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              const monthTotal = items.reduce((s, inv) => s + parseFloat(inv.total), 0)
              return (
                <div key={month}>
                  <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text)' }}>{month}</span>
                    <span className="text-price" style={{ fontSize: '0.8125rem', color: 'var(--wp-text)' }}>${monthTotal.toFixed(2)}</span>
                  </div>

                  {items.map((inv, idx) => {
                    const status = effectiveStatus(inv)
                    return (
                      <SwipeableRow
                        key={inv.id}
                        actions={[
                          { label: 'Share', icon: <Share2 size={16} />, color: 'white', bg: 'var(--wp-brand)', onClick: () => handleShare({} as React.MouseEvent, inv.id) },
                          ...(status !== 'paid' ? [{ label: 'Paid', icon: <Check size={16} />, color: 'white', bg: 'var(--wp-success-v2)', onClick: () => handleMarkPaid(inv.id) }] : []),
                        ]}
                      >
                        <div onClick={() => router.push(`/${locale}/invoices/${inv.id}`)}
                          onTouchStart={() => router.prefetch(`/${locale}/invoices/${inv.id}`)}
                          className="cursor-pointer active:bg-[var(--wp-surface-2)] flex gap-3 items-start"
                          style={{
                            padding: '0.75rem 0',
                            borderBottom: '1px solid var(--wp-border-light)',
                            animation: 'fadeSlideIn 0.3s ease both',
                            animationDelay: `${idx * 30}ms`,
                          }}>
                          <ClientAvatar name={inv.clientName} size="md" className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between">
                              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text)' }}>{inv.clientName}</span>
                              <span className="text-price" style={{ fontSize: '0.9375rem', color: 'var(--wp-text)' }}>${parseFloat(inv.total).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>
                                {(inv.dueDate ? new Date(inv.dueDate) : new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · #{inv.number.replace('INV-', '')}
                              </span>
                              <InvoiceStatusBadge status={status} label={t.status[status]} />
                            </div>
                          </div>
                        </div>
                      </SwipeableRow>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.dueDate}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.total}</th>
                    <th className="px-4 py-3 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {monthKeys.map((month) => {
                    const items = grouped[month]
                    const monthTotal = items.reduce((s, inv) => s + parseFloat(inv.total), 0)
                    const monthOutstanding = items
                      .filter(inv => { const st = effectiveStatus(inv); return st === 'sent' || st === 'overdue' })
                      .reduce((s, inv) => s + parseFloat(inv.total), 0)
                    return (
                      <Fragment key={month}>
                        <tr style={{ background: 'var(--wp-surface-2)' }}>
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-2)' }}>
                                {month}
                                <span className="ml-2 font-normal" style={{ color: 'var(--wp-text-3)' }}>· {items.length}</span>
                              </span>
                              <div className="flex items-center gap-3">
                                {monthOutstanding > 0 && (
                                  <span className="text-xs font-medium" style={{ color: 'var(--wp-warning-v2)' }}>
                                    {locale === 'es' ? 'Pendiente' : 'Outstanding'}: ${monthOutstanding.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${monthTotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {items.map((inv) => {
                          const status = effectiveStatus(inv)
                          return (
                            <tr key={inv.id} onClick={() => router.push(`/${locale}/invoices/${inv.id}`)}
                              onMouseEnter={() => router.prefetch(`/${locale}/invoices/${inv.id}`)}
                              className="group cursor-pointer hover:bg-[var(--wp-surface-2)] transition-colors"
                              style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                              <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--wp-text-2)' }}>
                                #{inv.number.replace('INV-', '')}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <ClientAvatar name={inv.clientName} size="md" />
                                  <span style={{ color: 'var(--wp-text)', fontWeight: 500 }}>{inv.clientName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusPill tone={STATUS_TONE[status]}>{t.status[status]}</StatusPill>
                              </td>
                              <td className="px-4 py-3" style={{ color: status === 'overdue' ? 'var(--wp-error-v2)' : 'var(--wp-text-2)', fontWeight: status === 'overdue' ? 500 : 400 }}>
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-right text-price tabular-nums" style={{ color: 'var(--wp-text)' }}>
                                ${parseFloat(inv.total).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {(status === 'sent' || status === 'overdue') && (
                                    <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.id) }}
                                      className="text-xs px-2 py-1 rounded font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)', border: '1px solid var(--wp-success-border)' }}
                                    >{t.markAsPaid}</button>
                                  )}
                                  <button onClick={e => handleShare(e, inv.id)}
                                    className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ minHeight: 'auto' }} aria-label="Share invoice">
                                    {copiedId === inv.id ? <Check size={14} style={{ color: 'var(--wp-success-v2)' }} /> : <Share2 size={14} />}
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
