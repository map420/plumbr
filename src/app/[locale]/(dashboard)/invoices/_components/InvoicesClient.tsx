'use client'

import { useState, useTransition, Fragment } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updateInvoice } from '@/lib/actions/invoices'
import { generateInvoiceShareToken } from '@/lib/actions/portal'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Receipt, Plus, Share2, Check, Trash2 } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
type Invoice = { id: string; number: string; clientName: string; status: string; dueDate: Date | null; total: string; paidAt: Date | null }
type T = { title: string; new: string; empty: string; markAsPaid: string; status: Record<InvoiceStatus, string>; fields: { number: string; clientName: string; dueDate: string; total: string } }

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
  return inv.status as InvoiceStatus
}

export function InvoicesClient({ initialInvoices, translations: t }: { initialInvoices: Invoice[]; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
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

  // Context metrics
  const overdue = initialInvoices.filter(inv => effectiveStatus(inv) === 'overdue')
  const outstanding = initialInvoices.filter(inv => { const s = effectiveStatus(inv); return s === 'sent' || s === 'overdue' })
  const paidCount = initialInvoices.filter(inv => effectiveStatus(inv) === 'paid').length

  // Group by month/year
  const grouped = filteredInvoices.reduce<Record<string, Invoice[]>>((acc, inv) => {
    const dateRef = inv.dueDate ?? inv.paidAt ?? new Date()
    const key = new Date(dateRef).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(inv)
    return acc
  }, {})
  const monthKeys = Object.keys(grouped)

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full">
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">{t.title}</h1>
        <Link href={`/${locale}/invoices/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
      </div>

      <div className="mb-3">
        <input type="text"
          placeholder={locale === 'es' ? 'Buscar facturas' : 'Search all invoices'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-primary)' }}
        />
      </div>

      {/* Mobile: tab-bar */}
      <div className="tab-bar mb-1 md:hidden">
        <button onClick={() => setFilter(filter === 'all' ? 'all' : 'all')} className={`tab-bar-item ${filter === 'all' ? 'tab-bar-item-active' : ''}`}>
          {locale === 'es' ? 'Activas' : 'Active'}
        </button>
        <button onClick={() => setFilter(filter === 'sent' ? 'all' : 'sent')} className={`tab-bar-item ${filter === 'sent' ? 'tab-bar-item-active' : ''}`}>
          {locale === 'es' ? 'Enviadas' : 'Sent'}
        </button>
        <button onClick={() => setFilter(filter === 'paid' ? 'all' : 'paid')} className={`tab-bar-item ${filter === 'paid' ? 'tab-bar-item-active' : ''}`}>
          {locale === 'es' ? 'Pagadas' : 'Paid'}
        </button>
        <button onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className={`tab-bar-item ${filter === 'overdue' ? 'tab-bar-item-active' : ''}`}>
          {locale === 'es' ? 'Vencidas' : 'Overdue'}
        </button>
      </div>

      {/* Desktop: pill filters with counters */}
      <div className="hidden md:flex tab-pills mb-1">
        <button onClick={() => setFilter('all')} className={`tab-pill ${filter === 'all' ? 'tab-pill-active' : ''}`}>All <span className="ml-1 opacity-60">{initialInvoices.length}</span></button>
        {(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map(s => {
          const count = initialInvoices.filter(i => i.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setFilter(s)} className={`tab-pill ${filter === s ? 'tab-pill-active' : ''}`}>
              {t.status[s]} <span className="ml-1 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Context bar — overdue insight */}
      {overdue.length > 0 && filter === 'all' && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ background: 'var(--wp-error-bg)', borderLeft: '3px solid var(--wp-error)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--wp-error)', flex: 1 }}>
            <strong>{overdue.length}</strong> {locale === 'es' ? 'vencidas' : 'overdue'} — ${overdue.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(2)}
          </span>
          <button onClick={() => setFilter('overdue')} style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wp-error)' }}>
            {locale === 'es' ? 'Ver' : 'View'}
          </button>
        </div>
      )}

      {/* Payment progress bar */}
      {filter === 'all' && outstanding.length > 0 && (
        <div className="mb-3">
          <div className="flex h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
            <div style={{ width: `${(paidCount / (paidCount + outstanding.length)) * 100}%`, background: 'var(--wp-success)' }} />
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)', marginTop: '0.375rem' }}>
            {paidCount} of {paidCount + outstanding.length} {locale === 'es' ? 'pagadas' : 'paid'}
          </p>
        </div>
      )}

      {filteredInvoices.length === 0 ? (
        <div className="card empty-state"><Receipt size={36} className="empty-state-icon" /><p className="empty-state-text">{filter === 'all' ? t.empty : `No ${filter} invoices.`}</p></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              const monthTotal = items.reduce((s, inv) => s + parseFloat(inv.total), 0)
              return (
                <div key={month}>
                  {/* Month header — shaded */}
                  <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text-primary)' }}>{month}</span>
                    <span className="text-price" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-primary)' }}>${monthTotal.toFixed(2)}</span>
                  </div>

                  {/* Invoice rows — Joist style + swipe actions */}
                  {items.map((inv, idx) => {
                    const status = effectiveStatus(inv)
                    return (
                      <SwipeableRow
                        key={inv.id}
                        actions={[
                          { label: 'Share', icon: <Share2 size={16} />, color: 'white', bg: 'var(--wp-primary)', onClick: () => handleShare({} as any, inv.id) },
                          ...(status !== 'paid' ? [{ label: 'Paid', icon: <Check size={16} />, color: 'white', bg: 'var(--wp-success)', onClick: () => handleMarkPaid(inv.id) }] : []),
                        ]}
                      >
                        <div onClick={() => router.push(`/${locale}/invoices/${inv.id}`)}
                          onTouchStart={() => router.prefetch(`/${locale}/invoices/${inv.id}`)}
                          className="cursor-pointer active:bg-[var(--wp-bg-muted)]"
                          style={{
                            padding: '0.75rem 0',
                            borderBottom: '1px solid var(--wp-border-light)',
                            animation: 'fadeSlideIn 0.3s ease both',
                            animationDelay: `${idx * 30}ms`,
                          }}>
                          <div className="flex items-baseline justify-between">
                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text-primary)' }}>{inv.clientName}</span>
                            <span className="text-price" style={{ fontSize: '0.9375rem', color: 'var(--wp-text-primary)' }}>${parseFloat(inv.total).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>
                              {(inv.dueDate ? new Date(inv.dueDate) : new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · #{inv.number.replace('INV-', '')}
                            </span>
                            <InvoiceStatusBadge status={status} label={t.status[status]} />
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
          <div className={`hidden md:block card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
            <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.number}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.clientName}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.dueDate}</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.total}</th>
                  <th className="px-4 py-3" />
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
                      <tr style={{ background: 'var(--wp-bg-muted)' }}>
                        <td colSpan={5} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ color: 'var(--wp-text-primary)' }}>{month}</span>
                            <div className="flex items-center gap-3">
                              {monthOutstanding > 0 && <span className="text-xs" style={{ color: 'var(--wp-warning)' }}>Outstanding: ${monthOutstanding.toFixed(2)}</span>}
                              <span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>Total: ${monthTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </td>
                        <td />
                      </tr>
                      {items.map((inv) => {
                        const status = effectiveStatus(inv)
                        return (
                          <tr key={inv.id} onClick={() => router.push(`/${locale}/invoices/${inv.id}`)}
                            className="transition-colors cursor-pointer"
                            style={{ borderBottom: '1px solid var(--wp-border-light)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--wp-bg-muted)'; router.prefetch(`/${locale}/invoices/${inv.id}`) }}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td className="px-4 py-3 font-medium" style={{ color: 'var(--wp-text-primary)' }}>{inv.number}</td>
                            <td className="px-4 py-3" style={{ color: 'var(--wp-text-secondary)' }}>{inv.clientName}</td>
                            <td className="px-4 py-3"><InvoiceStatusBadge status={status} label={t.status[status]} /></td>
                            <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--wp-text-primary)' }}>${parseFloat(inv.total).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={e => handleShare(e, inv.id)} className="transition-colors" style={{ color: 'var(--wp-text-muted)' }} title="Copy client link" aria-label="Share invoice">
                                  {copiedId === inv.id ? <Check size={14} style={{ color: 'var(--wp-success)' }} /> : <Share2 size={14} />}
                                </button>
                                {(status === 'sent' || status === 'overdue') && (
                                  <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.id) }}
                                    className="text-xs px-2 py-1 rounded font-medium"
                                    style={{ background: 'var(--wp-success-bg)', color: 'var(--wp-success)' }}
                                  >{t.markAsPaid}</button>
                                )}
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
