'use client'

import type { ReactNode } from 'react'

export function FormRow({
  label,
  subtitle,
  children,
  align = 'center',
}: {
  label: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div
      className="grid gap-3 md:gap-6 py-4"
      style={{
        gridTemplateColumns: 'minmax(0, 1fr)',
        borderBottom: '1px solid var(--wp-border-light)',
      }}
    >
      <div className="md:grid md:gap-6" style={{ gridTemplateColumns: '220px 1fr', alignItems: align === 'center' ? 'center' : 'start' }}>
        <div className="mb-1.5 md:mb-0">
          <div className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{label}</div>
          {subtitle && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>{subtitle}</div>
          )}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
