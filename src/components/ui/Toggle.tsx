/**
 * Toggle — v2 accessible switch. Replaces the 5+ duplicated inline
 * toggle implementations in EstimateFormClient.
 *
 * Controlled: pass `checked` + `onChange`.
 */
'use client'

import { cn } from '@/lib/utils'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

export function Toggle({ checked, onChange, disabled, className, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'wp-toggle',
        checked && 'wp-toggle--on',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    />
  )
}
