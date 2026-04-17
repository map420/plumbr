/**
 * DetailSidebar + SideCard — v2 sticky sidebar column for detail pages.
 * Pairs with <DocHero /> in a 2-column grid layout.
 *
 * <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
 *   <div>{main}</div>
 *   <DetailSidebar>
 *     <SideCard dark>…total…</SideCard>
 *     <SideCard>…activity…</SideCard>
 *   </DetailSidebar>
 * </div>
 */
import { cn } from '@/lib/utils'

export interface DetailSidebarProps {
  children: React.ReactNode
  /** Make the sidebar sticky at `top` (default 16px). */
  sticky?: boolean
  className?: string
}

export function DetailSidebar({ children, sticky, className }: DetailSidebarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        sticky && 'sticky top-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface SideCardProps {
  label?: React.ReactNode
  children: React.ReactNode
  /** Use the dark (navy gradient) background — for "Total" etc. */
  dark?: boolean
  className?: string
}

export function SideCard({ label, children, dark, className }: SideCardProps) {
  return (
    <div className={cn('wp-side-card', dark && 'wp-side-card--dark', className)}>
      {label && <div className="wp-side-card-label">{label}</div>}
      {children}
    </div>
  )
}
