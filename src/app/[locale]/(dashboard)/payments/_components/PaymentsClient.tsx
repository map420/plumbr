'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DollarSign, TrendingUp, Receipt, ChevronRight } from 'lucide-react'
import { KpiCard, ClientAvatar, StatusPill, type StatusTone } from '@/components/ui'

type DueInvoice = {
  id: string; number: string; clientName: string; total: string
  status: string; dueDate: string | null; createdAt: string
}

const STATUS_TONE: Record<string, StatusTone> = {
  sent: 'sent',
  overdue: 'overdue',
  partial: 'partial',
}

export function PaymentsClient({ dueInvoices, ytdRevenue, monthRevenue, winRate, monthInvoiceVolume, monthName }: {
  dueInvoices: DueInvoice[]; ytdRevenue: number; monthRevenue: number
  winRate: number; monthInvoiceVolume: number; monthName: string
}) {
  const { locale } = useParams()
  const totalDue = dueInvoices.reduce((s, inv) => s + parseFloat(inv.total), 0)

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-5xl">
      <div>
        <h1 className="page-title mb-0">
          {locale === 'es' ? 'Pagos recibidos' : 'Payments received'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
          {locale === 'es' ? 'Vista consolidada de todos los ingresos' : 'Consolidated view of all revenue'}
          {' · '}{monthName}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KpiCard
          tone="success"
          label={locale === 'es' ? 'Ingresos YTD' : 'Revenue YTD'}
          value={`$${ytdRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subTone={ytdRevenue > 0 ? 'up' : 'neutral'}
          sub={locale === 'es' ? 'Año en curso' : 'Year to date'}
        />
        <KpiCard
          tone="info"
          label={locale === 'es' ? `Revenue · ${monthName}` : `Revenue · ${monthName}`}
          value={`$${monthRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={locale === 'es' ? 'Cobrado este mes' : 'Collected this month'}
        />
        <KpiCard
          tone="brand"
          label={locale === 'es' ? 'Win rate' : 'Win rate'}
          value={`${winRate}%`}
          sub={locale === 'es' ? 'Estimates aprobados' : 'Estimates approved'}
          subTone={winRate >= 50 ? 'up' : 'neutral'}
        />
        <KpiCard
          tone="warning"
          label={locale === 'es' ? 'Pendiente' : 'Outstanding'}
          value={`$${totalDue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={`${dueInvoices.length} ${locale === 'es' ? 'facturas' : 'invoices'}`}
        />
      </div>

      {/* Due Invoices — table style */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>
            {locale === 'es' ? 'Facturas pendientes' : 'Outstanding invoices'}
            {dueInvoices.length > 0 && (
              <span className="ml-2 font-normal text-xs" style={{ color: 'var(--wp-text-3)' }}>
                · ${totalDue.toLocaleString('en-US', { maximumFractionDigits: 0 })} total
              </span>
            )}
          </h2>
          <Link href={`/${locale}/invoices`} className="text-xs font-medium flex items-center gap-0.5 hover:underline" style={{ color: 'var(--wp-brand)' }}>
            {locale === 'es' ? 'Ver todas' : 'View all'} <ChevronRight size={12} />
          </Link>
        </div>

        {dueInvoices.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: 'var(--wp-text-3)' }}>
            {locale === 'es' ? 'Sin facturas pendientes ✓' : 'No pending invoices ✓'}
          </p>
        ) : (
          <>
            {/* Table header — desktop only */}
            <div className="hidden md:grid grid-cols-[1fr_100px_100px_80px_100px] gap-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-light)', color: 'var(--wp-text-3)' }}>
              <span>Client</span>
              <span>Invoice</span>
              <span>Date</span>
              <span>Status</span>
              <span className="text-right">Amount</span>
            </div>
            {dueInvoices.map((inv, idx) => (
              <Link
                key={inv.id}
                href={`/${locale}/invoices/${inv.id}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_80px_100px] gap-1 md:gap-3 px-5 py-3 items-center transition-colors hover:bg-[var(--wp-surface-2)]"
                style={{ borderBottom: idx < dueInvoices.length - 1 ? '1px solid var(--wp-border-light)' : 'none', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClientAvatar name={inv.clientName} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--wp-text)' }}>{inv.clientName}</div>
                  </div>
                </div>
                <span className="text-xs font-mono hidden md:block" style={{ color: 'var(--wp-text-2)' }}>#{inv.number.replace('INV-', '')}</span>
                <span className="text-xs hidden md:block" style={{ color: 'var(--wp-text-3)' }}>
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
                <div className="hidden md:block">
                  <StatusPill tone={STATUS_TONE[inv.status] ?? 'neutral'}>
                    {inv.status}
                  </StatusPill>
                </div>
                <span className="text-sm font-semibold tabular-nums text-right" style={{ color: inv.status === 'overdue' ? 'var(--wp-error-v2)' : 'var(--wp-text)' }}>
                  ${parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </Link>
            ))}
            <div className="px-5 py-2.5 text-xs" style={{ borderTop: '1px solid var(--wp-border-light)', background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
              {locale === 'es'
                ? 'Las facturas pagadas en línea cambian de estado automáticamente.'
                : 'Invoices paid online update status automatically.'}
            </div>
          </>
        )}
      </div>

      {/* Reports */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--wp-text)' }}>
          {locale === 'es' ? 'Reportes' : 'Reports'}
        </h2>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--wp-success-bg-v2)' }}>
              <DollarSign size={16} style={{ color: 'var(--wp-success-v2)' }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Revenue</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                <strong className="font-semibold" style={{ color: 'var(--wp-text)' }}>${monthRevenue.toLocaleString('en-US')}</strong> received in payments for {monthName}
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--wp-text-3)' }} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--wp-info-bg-v2)' }}>
              <TrendingUp size={16} style={{ color: 'var(--wp-info-v2)' }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Estimates</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                <strong className="font-semibold" style={{ color: 'var(--wp-text)' }}>{winRate}%</strong> is your win rate for this year
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--wp-text-3)' }} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-[var(--wp-surface-3)]" style={{ background: 'var(--wp-surface-2)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--wp-purple-bg)' }}>
              <Receipt size={16} style={{ color: 'var(--wp-purple)' }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Invoices</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-2)' }}>
                <strong className="font-semibold" style={{ color: 'var(--wp-text)' }}>${monthInvoiceVolume.toLocaleString('en-US')}</strong> total invoiced volume for the month
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--wp-text-3)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
