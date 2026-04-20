'use client'

import type { ReactNode } from 'react'

export function SectionCard({
  title,
  subtitle,
  footer,
  headerRight,
  children,
}: {
  title: string
  subtitle?: string
  footer?: ReactNode
  headerRight?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)' }}
    >
      <div className="px-5 md:px-6 pt-5 pb-4 flex items-start justify-between gap-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="min-w-0">
          <h2 className="text-base font-semibold" style={{ color: 'var(--wp-text)' }}>{title}</h2>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--wp-text-3)' }}>{subtitle}</p>
          )}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      <div className="px-5 md:px-6">
        {children}
      </div>
      {footer && (
        <div
          className="px-5 md:px-6 py-3 flex justify-end items-center gap-2"
          style={{ background: 'var(--wp-surface-2)', borderTop: '1px solid var(--wp-border-light)' }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
