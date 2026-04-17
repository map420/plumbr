/**
 * Toolbar — v2 list-toolbar: search input + optional segmented control + optional actions.
 * Unifies the "search + filter pills" row seen in Estimates, Invoices, Clients, etc.
 *
 * <Toolbar
 *   searchPlaceholder="Buscar..."
 *   search={search}
 *   onSearchChange={setSearch}
 *   right={<Segmented value={filter} onChange={setFilter} options={…} />}
 * />
 */
'use client'

import { cn } from '@/lib/utils'

export interface ToolbarProps {
  search: string
  onSearchChange: (s: string) => void
  searchPlaceholder?: string
  /** Element(s) rendered to the right of the search (segmented, dropdown, actions). */
  right?: React.ReactNode
  className?: string
}

export function Toolbar({
  search, onSearchChange, searchPlaceholder, right, className,
}: ToolbarProps) {
  return (
    <div className={cn('wp-toolbar', className)}>
      <div className="wp-toolbar-search">
        <svg
          className="wp-toolbar-search-icon"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder ?? 'Search'}
        />
      </div>
      {right}
    </div>
  )
}
