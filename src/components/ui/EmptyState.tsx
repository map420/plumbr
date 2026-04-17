/**
 * EmptyState — v2 empty result card with icon + title + description + optional CTA.
 * Centered and used inside cards when a list/query returns no items.
 *
 * <EmptyState
 *   icon={<FileText size={36} />}
 *   title="No estimates yet"
 *   description="Create your first estimate to start tracking work."
 *   cta={<Link href="/new" className="btn-primary btn-sm">+ New estimate</Link>}
 * />
 */
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  cta?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, cta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'bg-[color:var(--wp-surface)] border border-[color:var(--wp-border-v2)] rounded-[10px]',
        'py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div
          className="mb-3 opacity-40"
          style={{ color: 'var(--wp-text-3)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <div
        className="text-base font-semibold mb-1"
        style={{ color: 'var(--wp-text)' }}
      >
        {title}
      </div>
      {description && (
        <div
          className="text-sm mb-4 max-w-sm"
          style={{ color: 'var(--wp-text-2)' }}
        >
          {description}
        </div>
      )}
      {cta}
    </div>
  )
}
