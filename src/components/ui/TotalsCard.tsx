/**
 * TotalsCard — v2 dark card showing a hero total + breakdown rows.
 * Appears in the sidebar of estimate/invoice detail and new/edit form.
 *
 * <TotalsCard
 *   label="Total amount"
 *   total="$1,512.00"
 *   rows={[
 *     { k: 'Subtotal', v: '$1,400.00' },
 *     { k: 'Tax (8%)', v: '$112.00' },
 *   ]}
 * />
 */
import { SideCard } from './DetailSidebar'
import { cn } from '@/lib/utils'

export interface TotalsRow {
  k: React.ReactNode
  v: React.ReactNode
  /** Emphasized row (e.g. Deposit), rendered above the baseline color. */
  emphasis?: boolean
}

export interface TotalsCardProps {
  label: React.ReactNode
  total: React.ReactNode
  rows?: TotalsRow[]
  className?: string
}

export function TotalsCard({ label, total, rows, className }: TotalsCardProps) {
  return (
    <SideCard dark label={label} className={className}>
      <div className="wp-side-card-total">{total}</div>
      {rows && rows.length > 0 && (
        <div
          className={cn(
            'mt-4 pt-3',
            'text-xs',
          )}
          style={{
            borderTop: '1px solid rgb(255 255 255 / 0.12)',
            opacity: 0.9,
            color: 'white',
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex justify-between py-[3px] tabular-nums"
              style={r.emphasis ? { fontWeight: 600, opacity: 1, color: 'var(--wp-ai-accent)' } : undefined}
            >
              <span>{r.k}</span>
              <span>{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </SideCard>
  )
}
