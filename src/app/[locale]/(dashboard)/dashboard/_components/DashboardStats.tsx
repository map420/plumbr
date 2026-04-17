'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useLocale } from 'next-intl'
import { Briefcase, AlertTriangle, Receipt, ChevronRight, ChevronDown, Calendar, X, Clock, CheckCircle2, Lightbulb, Bot } from 'lucide-react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'

// Recharts is ~95kB gzipped — lazy-load it so the dashboard shell paints
// before the chart JS arrives.
const RevenueChart = dynamic(() => import('./RevenueChart'), {
  ssr: false,
  loading: () => <div style={{ height: 130, background: 'var(--wp-bg-muted)', borderRadius: 8, opacity: 0.5 }} aria-hidden />,
})

type T = {
  greeting: string; subtitle: string
  stats: { activeJobs: string; openEstimates: string; revenueThisMonth: string; avgJobMargin: string }
  quickActions: { title: string; newEstimate: string; newJob: string }
}

type Props = {
  stats: { activeJobs: number; revenueThisMonth: number; unpaidTotal: number; unpaidCount: number; winRate: number | null }
  alerts: { type: string; label: string; href: string }[]
  todayJobs: { id: string; name: string; clientName: string; time: string | null }[]
  activeJobs: { id: string; name: string; clientName: string }[]
  revenueByMonth: { month: string; revenue: number; projected: number }[]
  dueThisWeek: { id: string; number: string; clientName: string; total: string; dueDay: string }[]
  pipeline: { pending: number; unpaid: number; paid: number }
  insights: { text: string; href: string; label: string }[]
  projectionSummary: string
  translations: T
}

export function DashboardStats({ stats, alerts, todayJobs, activeJobs, revenueByMonth, dueThisWeek, pipeline, insights, projectionSummary, translations: t }: Props) {
  const locale = useLocale()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set())
  const [showActiveJobs, setShowActiveJobs] = useState(false)

  // Merge alerts + due this week into one action list
  const actionItems: { type: 'alert' | 'due'; label: string; href: string; alertType?: string; index?: number }[] = []
  alerts.forEach((a, i) => {
    if (!dismissedAlerts.has(i)) actionItems.push({ type: 'alert', label: a.label, href: a.href, alertType: a.type, index: i })
  })
  dueThisWeek.forEach(inv => {
    actionItems.push({ type: 'due', label: `${inv.clientName} — $${formatCurrency(inv.total)} · ${inv.dueDay}`, href: `/invoices/${inv.id}` })
  })

  const hasTodayJobs = todayJobs.length > 0

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-4">

      {/* ── BLOQUE 1: DINERO ── */}
      <div className="card p-4">
        {/* Revenue + Unpaid inline */}
        <div className="flex items-stretch gap-0 mb-3">
          <Link href={`/${locale}/payments`} className="flex-1 pr-4">
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--wp-text-muted)' }}>{t.stats.revenueThisMonth}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>
              {stats.revenueThisMonth > 0 ? `$${formatCurrencyCompact(stats.revenueThisMonth)}` : '—'}
            </p>
            {/* Sparkline bars */}
            {revenueByMonth.length > 0 && (
              <div className="flex items-end gap-1 h-6 mt-2">
                {revenueByMonth.slice(-7).map((m, i, arr) => {
                  const max = Math.max(...arr.map(x => x.revenue), 1)
                  const h = Math.max((m.revenue / max) * 100, 4)
                  return (
                    <div key={i} className="rounded-sm" style={{
                      width: 4, height: `${h}%`,
                      background: 'var(--wp-brand)',
                      opacity: i === arr.length - 1 ? 1 : 0.3,
                    }} />
                  )
                })}
              </div>
            )}
          </Link>
          <div className="mx-4" style={{ width: 1, background: 'var(--wp-border)' }} />
          <Link href={`/${locale}/invoices`} className="flex-1 pl-4">
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--wp-text-muted)' }}>Unpaid</p>
            <p className="text-2xl font-bold" style={{ color: stats.unpaidCount > 0 ? 'var(--wp-error-v2, var(--wp-accent))' : 'var(--wp-success)' }}>
              ${formatCurrencyCompact(stats.unpaidTotal)}
            </p>
            {stats.unpaidCount > 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--wp-error-v2, var(--wp-accent))' }}>
                {stats.unpaidCount} {locale === 'es' ? 'facturas' : 'invoices'}
              </p>
            )}
          </Link>
        </div>

        {/* Pipeline — 4-cell grid */}
        <div className="grid grid-cols-4 gap-2 pt-3" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
          <Link href={`/${locale}/estimates`} className="rounded-lg p-2.5 text-center transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-info-v2)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--wp-text)' }}>{pipeline.pending}</span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-3)' }}>Pending</span>
          </Link>
          <div className="rounded-lg p-2.5 text-center" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-success-v2)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--wp-text)' }}>—</span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-3)' }}>Approved</span>
          </div>
          <Link href={`/${locale}/invoices`} className="rounded-lg p-2.5 text-center transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-warning-v2)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--wp-text)' }}>{pipeline.unpaid}</span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-3)' }}>Unpaid</span>
          </Link>
          <Link href={`/${locale}/payments`} className="rounded-lg p-2.5 text-center transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--wp-brand)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--wp-text)' }}>{pipeline.paid}</span>
            </div>
            <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-3)' }}>Paid MTD</span>
          </Link>
        </div>
      </div>

      {/* ── BLOQUE 2: NEEDS ATTENTION ── */}
      <div className="card overflow-hidden">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide px-4 pt-3 pb-2" style={{ color: 'var(--wp-text-muted)' }}>Needs Attention</h2>
        {actionItems.length === 0 ? (
          <div className="flex items-center gap-2 px-4 pb-3">
            <CheckCircle2 size={14} style={{ color: 'var(--wp-success)' }} />
            <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>All caught up — nothing needs your attention.</p>
          </div>
        ) : (
          actionItems.map((item, i) => (
            <div key={`${item.type}-${i}`}
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={i < actionItems.length - 1 ? { borderBottom: '1px solid var(--wp-border-light)' } : undefined}>
              {item.type === 'alert' ? (
                <AlertTriangle size={14} className="shrink-0" style={{ color: item.alertType === 'error' ? 'var(--wp-error)' : 'var(--wp-warning)' }} />
              ) : (
                <Clock size={14} className="shrink-0" style={{ color: 'var(--wp-primary)' }} />
              )}
              <Link href={`/${locale}${item.href}`}
                className="flex-1 text-sm"
                style={{ color: item.type === 'alert' ? (item.alertType === 'error' ? 'var(--wp-error)' : 'var(--wp-warning)') : 'var(--wp-text-primary)' }}>
                {item.label}
              </Link>
              {item.type === 'alert' && item.index !== undefined && (
                <button onClick={() => setDismissedAlerts(prev => new Set(prev).add(item.index!))}
                  className="shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                  <X size={13} />
                </button>
              )}
              {item.type === 'due' && (
                <ChevronRight size={14} className="shrink-0" style={{ color: 'var(--wp-border)' }} />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── BLOQUE 3: TRABAJO ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-muted)' }}>
              {hasTodayJobs ? 'Today' : 'Active Jobs'}
            </h2>
            {hasTodayJobs && (
              <Link href={`/${locale}/jobs`} className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--wp-primary)' }}>
                <Briefcase size={12} />
                {stats.activeJobs} active
              </Link>
            )}
          </div>
          <Link href={`/${locale}/schedule`} className="text-[11px] font-medium" style={{ color: 'var(--wp-accent)' }}>Schedule</Link>
        </div>

        {hasTodayJobs ? (
          /* Today's jobs */
          <div className="space-y-1.5">
            {todayJobs.map(job => (
              <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg transition-colors" style={{ background: 'var(--wp-bg-muted)' }}>
                {job.time && (
                  <span className="text-xs font-semibold shrink-0 w-14" style={{ color: 'var(--wp-accent)' }}>{job.time}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--wp-text-muted)' }}>{job.clientName}</p>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--wp-border)' }} />
              </Link>
            ))}
          </div>
        ) : activeJobs.length > 0 ? (
          /* Active jobs — collapsible */
          <div>
            <button onClick={() => setShowActiveJobs(!showActiveJobs)}
              className="w-full flex items-center justify-between py-2 transition-colors">
              <span className="text-xs font-medium" style={{ color: 'var(--wp-text-secondary)' }}>
                {stats.activeJobs} active job{stats.activeJobs !== 1 ? 's' : ''} — no schedule today
              </span>
              <ChevronDown size={14} className="transition-transform" style={{ color: 'var(--wp-text-muted)', transform: showActiveJobs ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showActiveJobs && (
              <div className="space-y-1.5 pt-1">
                {activeJobs.map(job => (
                  <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg transition-colors" style={{ background: 'var(--wp-bg-muted)' }}>
                    <Briefcase size={13} className="shrink-0" style={{ color: 'var(--wp-text-muted)' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--wp-text-muted)' }}>{job.clientName}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--wp-border)' }} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* No jobs at all */
          <div className="py-2 text-center">
            <p className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>No active jobs</p>
          </div>
        )}
      </div>

      {/* ── BLOQUE 4: REVENUE & FORECAST ── */}
      {revenueByMonth.some(m => m.revenue > 0 || m.projected > 0) && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-muted)' }}>Revenue & Forecast</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#1E3A5F' }} />
                <span className="text-[9px]" style={{ color: 'var(--wp-text-muted)' }}>Actual</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#1E3A5F', opacity: 0.25 }} />
                <span className="text-[9px]" style={{ color: 'var(--wp-text-muted)' }}>Projected</span>
              </div>
            </div>
          </div>
          <RevenueChart data={revenueByMonth} />
        </div>
      )}

      {/* Quick actions */}
      <div className="hidden md:grid grid-cols-4 gap-2.5">
        <Link href={`/${locale}/estimates/new`} className="card p-3 flex items-center gap-2.5 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <Receipt size={16} style={{ color: 'var(--wp-text-3)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>New estimate</span>
        </Link>
        <Link href={`/${locale}/jobs/new`} className="card p-3 flex items-center gap-2.5 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <Briefcase size={16} style={{ color: 'var(--wp-text-3)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>New job</span>
        </Link>
        <Link href={`/${locale}/invoices/new`} className="card p-3 flex items-center gap-2.5 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <Receipt size={16} style={{ color: 'var(--wp-text-3)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>Invoice</span>
        </Link>
        <Link href={`/${locale}/assistant`} className="card p-3 flex items-center gap-2.5 transition-colors" style={{ background: 'var(--wp-brand)', borderColor: 'var(--wp-brand)', color: 'white' }}>
          <Bot size={16} />
          <span className="text-xs font-semibold">Ask AI</span>
        </Link>
      </div>

      </div>{/* end left column */}

      {/* ── RIGHT SIDEBAR ── */}
      <div className="space-y-4 lg:sticky lg:top-4">

      {/* ── AI INSIGHT (navy hero card when projection is weak) ── */}
      {insights.length > 0 && (
        <div className="wp-ai-card">
          <div className="wp-ai-card-head">
            <div className="wp-ai-icon">
              <Bot size={14} />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-ai-accent)' }}>
              WorkPilot AI
            </h2>
            <span
              className="ml-auto text-[9px] font-bold uppercase tracking-wider"
              style={{ color: 'rgb(255 255 255 / 0.5)' }}
            >
              Insight
            </span>
          </div>
          <p className="text-sm font-medium mb-3" style={{ color: 'white' }}>{projectionSummary}</p>
          <div className="space-y-1.5 mb-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs mt-0.5" style={{ color: 'var(--wp-ai-accent)' }}>•</span>
                <p className="text-xs" style={{ color: 'rgb(255 255 255 / 0.85)', lineHeight: 1.5 }}>{insight.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 relative">
            {insights.slice(0, 2).map((insight, i) => (
              <Link
                key={i}
                href={`/${locale}${insight.href}`}
                className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: 'rgb(255 255 255 / 0.1)',
                  color: 'white',
                  border: '1px solid rgb(255 255 255 / 0.15)',
                }}
              >
                {insight.label}
              </Link>
            ))}
            <Link
              href={`/${locale}/assistant?msg=${encodeURIComponent(`My projected revenue is weak. ${projectionSummary} Analyze my business situation and recommend specific actions to improve revenue.`)}`}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: 'var(--wp-ai-accent)',
                color: 'var(--wp-brand)',
              }}
            >
              <Bot size={12} /> Ask AI
            </Link>
          </div>
        </div>
      )}

      {/* Sidebar: Today's Schedule */}
      {hasTodayJobs && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-muted)' }}>
              {locale === 'es' ? 'Agenda de hoy' : "Today's schedule"}
            </h2>
            <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-muted)' }}>{todayJobs.length} jobs</span>
          </div>
          <div className="space-y-1.5">
            {todayJobs.slice(0, 4).map(job => (
              <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                className="flex items-center gap-2.5 p-2 rounded-lg transition-colors hover:bg-[var(--wp-surface-2)]"
                style={{ borderLeft: '2px solid var(--wp-info-v2)' }}>
                {job.time && (
                  <span className="text-[10px] font-bold tabular-nums shrink-0 w-12" style={{ color: 'var(--wp-text-3)' }}>{job.time}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--wp-text-3)' }}>{job.clientName}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      </div>{/* end right sidebar */}
      </div>{/* end 2-col grid */}
    </div>
  )
}
