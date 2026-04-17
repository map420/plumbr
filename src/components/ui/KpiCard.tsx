/**
 * KpiCard — v2 single metric card.
 * Used in dashboard KPI rows, estimates/invoices list headers, etc.
 *
 * <KpiCard tone="success" label="Paid MTD" value="$28,450" sub="↑ 12% vs last mo." subTone="up" />
 */
import { cn } from '@/lib/utils'

export type KpiTone = 'info' | 'success' | 'warning' | 'danger' | 'brand' | 'neutral'

const DOT_COLOR: Record<KpiTone, string> = {
  info: 'var(--wp-info-v2)',
  success: 'var(--wp-success-v2)',
  warning: 'var(--wp-warning-v2)',
  danger: 'var(--wp-error-v2)',
  brand: 'var(--wp-brand)',
  neutral: 'var(--wp-text-3)',
}

export interface KpiCardProps {
  label: string
  value: string | number
  sub?: React.ReactNode
  subTone?: 'up' | 'down' | 'neutral'
  tone?: KpiTone
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function KpiCard({
  label, value, sub, subTone = 'neutral', tone = 'neutral', icon, className, onClick,
}: KpiCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'wp-kpi',
        onClick && 'cursor-pointer transition-colors hover:border-[color:var(--wp-border-hover)] text-left w-full',
        className,
      )}
    >
      <div className="wp-kpi-label">
        {icon ? (
          <span className="inline-flex items-center" aria-hidden="true">{icon}</span>
        ) : (
          <span
            className="wp-kpi-label-dot"
            style={{ background: DOT_COLOR[tone] }}
            aria-hidden="true"
          />
        )}
        {label}
      </div>
      <div className="wp-kpi-value">{value}</div>
      {sub && (
        <div
          className={cn(
            'wp-kpi-sub',
            subTone === 'up' && 'wp-kpi-sub--up',
            subTone === 'down' && 'wp-kpi-sub--down',
          )}
        >
          {sub}
        </div>
      )}
    </Tag>
  )
}
