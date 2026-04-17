/**
 * Segmented — v2 segmented control (iOS-like tab group).
 * Replaces the inline tab-pills/tab-bar usage for filter selection.
 *
 * <Segmented
 *   value={filter}
 *   onChange={setFilter}
 *   options={[
 *     { value: 'all', label: 'All', count: 12 },
 *     { value: 'sent', label: 'Sent', count: 4 },
 *   ]}
 * />
 */
'use client'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
  count?: number
  /** Optional leading element (dot, icon). */
  leading?: React.ReactNode
}

export interface SegmentedProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  className?: string
  'aria-label'?: string
}

export function Segmented<T extends string>({
  value, onChange, options, className, ...rest
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('wp-seg', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn('wp-seg-item', value === opt.value && 'wp-seg-item--active')}
        >
          {opt.leading}
          <span>{opt.label}</span>
          {typeof opt.count === 'number' && (
            <span className="wp-seg-item-count">{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
