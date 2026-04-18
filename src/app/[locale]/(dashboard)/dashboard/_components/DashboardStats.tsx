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
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 items-start">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-4">

      {/* ── BLOQUE 1: DINERO ── */}
      <div className="card p-5">
        {/* Revenue + Unpaid inline */}
        <div className="flex items-stretch gap-0 mb-4">
          <Link href={`/${locale}/payments`} className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'var(--wp-success-bg-v2)' }}>
                <span className="text-[8px]" style={{ color: 'var(--wp-success-v2)' }}>↑</span>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.stats.revenueThisMonth}</p>
            </div>
            <p className="text-3xl font-extrabold tabular-nums" style={{ color: 'var(--wp-text)', letterSpacing: '-0.02em' }}>
              {stats.revenueThisMonth > 0 ? `$${formatCurrencyCompact(stats.revenueThisMonth)}` : '—'}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--wp-success-v2)' }}>↑ 12% vs {locale === 'es' ? 'marzo' : 'last month'}</p>
            {/* Sparkline bars */}
            {revenueByMonth.length > 0 && (
              <div className="flex items-end gap-[3px] h-8 mt-3">
                {revenueByMonth.slice(-9).map((m, i, arr) => {
                  const max = Math.max(...arr.map(x => x.revenue), 1)
                  const h = Math.max((m.revenue / max) * 100, 5)
                  return (
                    <div key={i} className="rounded-sm flex-1" style={{
                      height: `${h}%`,
                      background: 'var(--wp-brand)',
                      opacity: i === arr.length - 1 ? 1 : 0.25,
                    }} />
                  )
                })}
              </div>
            )}
          </Link>
          <div className="mx-5" style={{ width: 1, background: 'var(--wp-border)' }} />
          <Link href={`/${locale}/invoices`} className="flex-1 pl-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-4 h-4 rounded flex items-center justify-center" style={{ background: 'var(--wp-error-bg-v2)' }}>
                <span className="text-[8px]" style={{ color: 'var(--wp-error-v2)' }}>!</span>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Por cobrar' : 'Unpaid'}</p>
            </div>
            <p className="text-3xl font-extrabold tabular-nums" style={{ color: stats.unpaidCount > 0 ? 'var(--wp-error-v2)' : 'var(--wp-success-v2)', letterSpacing: '-0.02em' }}>
              ${formatCurrencyCompact(stats.unpaidTotal)}
            </p>
            {stats.unpaidCount > 0 && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--wp-error-v2)' }}>
                {stats.unpaidCount} {locale === 'es' ? 'facturas vencidas' : 'overdue invoices'}
              </p>
            )}
          </Link>
        </div>

        {/* Pipeline — 4-cell grid matching proposal */}
        <div className="grid grid-cols-4 gap-2 pt-3" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
          {[
            { href: `/${locale}/estimates`, count: pipeline.pending, label: locale === 'es' ? 'Pendientes' : 'Pending', color: 'var(--wp-info-v2)' },
            { href: `/${locale}/estimates`, count: 0, label: locale === 'es' ? 'Aprobados' : 'Approved', color: 'var(--wp-success-v2)' },
            { href: `/${locale}/invoices`, count: pipeline.unpaid, label: locale === 'es' ? 'Sin pagar' : 'Unpaid', color: 'var(--wp-warning-v2)', amount: stats.unpaidTotal },
            { href: `/${locale}/payments`, count: pipeline.paid, label: locale === 'es' ? 'Pagado MTD' : 'Paid MTD', color: 'var(--wp-brand)', amount: stats.revenueThisMonth },
          ].map((cell, i) => (
            <Link key={i} href={cell.href} className="rounded-lg p-3 transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)', borderBottom: `2px solid ${cell.color}` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cell.color }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{cell.label}</span>
              </div>
              <span className="text-xl font-bold tabular-nums block" style={{ color: 'var(--wp-text)' }}>{cell.count || '—'}</span>
              {cell.amount != null && cell.amount > 0 && (
                <p className="text-[10px] font-medium tabular-nums mt-0.5" style={{ color: 'var(--wp-text-2)' }}>${formatCurrencyCompact(cell.amount)}</p>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Needs attention + Today moved to RIGHT sidebar */}

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

      {/* Quick actions with subtexts */}
      <div className="hidden md:grid grid-cols-4 gap-2.5">
        <Link href={`/${locale}/estimates/new`} className="card p-3 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} style={{ color: 'var(--wp-text-3)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>New estimate</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Crear y enviar' : 'Create & send'}</p>
        </Link>
        <Link href={`/${locale}/jobs/new`} className="card p-3 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={16} style={{ color: 'var(--wp-text-3)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>New job</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Agendar trabajo' : 'Schedule work'}</p>
        </Link>
        <Link href={`/${locale}/invoices/new`} className="card p-3 hover:border-[color:var(--wp-brand)] transition-colors" style={{ borderColor: 'var(--wp-border-v2)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={16} style={{ color: 'var(--wp-text-3)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--wp-text)' }}>Invoice</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Cobrar cliente' : 'Bill client'}</p>
        </Link>
        <Link href={`/${locale}/assistant`} className="card p-3 transition-colors" style={{ background: 'var(--wp-brand)', borderColor: 'var(--wp-brand)', color: 'white' }}>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={16} />
            <span className="text-xs font-semibold">Ask WorkPilot AI</span>
          </div>
          <p className="text-[10px]" style={{ opacity: 0.7 }}>{locale === 'es' ? 'Análisis, draft, más' : 'Analysis, draft, more'}</p>
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

      {/* Today's schedule + Needs attention moved below AI insights */}

      {/* ── NEEDS ATTENTION (right sidebar) ── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-muted)' }}>
            {locale === 'es' ? 'Requiere tu atención' : 'Requires attention'}
          </h2>
          {actionItems.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-error-bg-v2)', color: 'var(--wp-error-v2)' }}>
              {actionItems.length}
            </span>
          )}
        </div>
        {actionItems.length === 0 ? (
          <div className="flex items-center gap-2 px-4 pb-3">
            <CheckCircle2 size={14} style={{ color: 'var(--wp-success)' }} />
            <p className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{locale === 'es' ? 'Todo al día' : 'All caught up'}</p>
          </div>
        ) : (
          actionItems.map((item, i) => (
            <Link key={`${item.type}-${i}`} href={`/${locale}${item.href}`}
              className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--wp-surface-2)]"
              style={i < actionItems.length - 1 ? { borderBottom: '1px solid var(--wp-border-light)' } : undefined}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{
                background: item.type === 'alert'
                  ? (item.alertType === 'error' ? 'var(--wp-error-v2)' : 'var(--wp-warning-v2)')
                  : 'var(--wp-info-v2)'
              }} />
              <span className="flex-1 text-xs" style={{ color: 'var(--wp-text)' }}>{item.label}</span>
              <ChevronRight size={12} className="shrink-0" style={{ color: 'var(--wp-text-3)' }} />
            </Link>
          ))
        )}
      </div>

      {/* ── TODAY'S SCHEDULE (right sidebar) ── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-muted)' }}>
            {locale === 'es' ? 'Agenda de hoy' : "Today's schedule"}
          </h2>
          <span className="text-[10px] font-medium" style={{ color: 'var(--wp-text-3)' }}>
            {hasTodayJobs ? `${todayJobs.length} jobs` : ''}
          </span>
        </div>
        {hasTodayJobs ? (
          <div className="space-y-1.5">
            {todayJobs.map(job => (
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
        ) : activeJobs.length > 0 ? (
          <div>
            <button onClick={() => setShowActiveJobs(!showActiveJobs)}
              className="w-full flex items-center justify-between py-1 transition-colors">
              <span className="text-xs" style={{ color: 'var(--wp-text-2)' }}>
                {stats.activeJobs} active — {locale === 'es' ? 'sin agenda hoy' : 'no schedule today'}
              </span>
              <ChevronDown size={12} className="transition-transform" style={{ color: 'var(--wp-text-3)', transform: showActiveJobs ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showActiveJobs && (
              <div className="space-y-1 pt-2">
                {activeJobs.slice(0, 5).map(job => (
                  <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-md transition-colors hover:bg-[var(--wp-surface-2)]">
                    <Briefcase size={11} style={{ color: 'var(--wp-text-3)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--wp-text-2)' }}>{job.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Sin agenda' : 'No schedule'}</p>
        )}
      </div>

      </div>{/* end right sidebar */}
      </div>{/* end 2-col grid */}
    </div>
  )
}
