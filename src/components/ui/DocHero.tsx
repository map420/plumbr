/**
 * DocHero — v2 hero card for document detail views
 * (estimate/invoice/job). Renders title, sub, actions, and a meta row.
 *
 * Slot-based composition:
 *   <DocHero
 *     title="#1042"
 *     sub="Issued Apr 14 · Valid until May 14"
 *     actions={<>…</>}
 *   >
 *     <DocMeta k="Status" v={<StatusPill tone="sent">Sent</StatusPill>} />
 *     <DocMeta k="Client" v="María González" />
 *     <DocMeta k="Total" v="$1,512.00" total className="ml-auto text-right" />
 *   </DocHero>
 */
import { cn } from '@/lib/utils'

export interface DocHeroProps {
  title: React.ReactNode
  sub?: React.ReactNode
  actions?: React.ReactNode
  /** Meta items — typically <DocMeta /> elements. */
  children?: React.ReactNode
  className?: string
}

export function DocHero({ title, sub, actions, children, className }: DocHeroProps) {
  return (
    <div className={cn('wp-doc-hero', className)}>
      <div className="wp-doc-hero-top">
        <div>
          <div className="wp-doc-hero-title">{title}</div>
          {sub && <div className="wp-doc-hero-sub">{sub}</div>}
        </div>
        {actions && <div className="wp-doc-hero-actions">{actions}</div>}
      </div>
      {children && <div className="wp-doc-meta-row">{children}</div>}
    </div>
  )
}

export interface DocMetaProps {
  k: React.ReactNode
  v: React.ReactNode
  /** Render the value with the larger "total" style. */
  total?: boolean
  className?: string
}

export function DocMeta({ k, v, total, className }: DocMetaProps) {
  return (
    <div className={cn('wp-meta-item flex flex-col', className)}>
      <div className="wp-meta-k">{k}</div>
      <div className={cn('wp-meta-v', total && 'wp-meta-v--total')}>{v}</div>
    </div>
  )
}
