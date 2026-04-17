'use client'

import React from 'react'

type ActionItem = {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

export function ActionBar({ actions }: { actions: ActionItem[] }) {
  return (
    <div className="flex items-center justify-around bg-white px-2 py-2" style={{ borderBottom: '1px solid var(--wp-border)' }}>
      {actions.map((action, i) => {
        const baseStyle: React.CSSProperties = {
          color: action.disabled ? 'var(--wp-text-muted)' :
            action.variant === 'primary' ? 'var(--wp-accent)' :
            action.variant === 'danger' ? 'var(--wp-error)' :
            'var(--wp-text-secondary)',
          opacity: action.disabled ? 0.4 : 1,
          cursor: action.disabled ? 'not-allowed' : 'pointer',
        }

        const className = 'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[60px]'

        if (action.href && !action.disabled) {
          return (
            <a key={i} href={action.href} className={className} style={baseStyle}>
              {action.icon}
              <span>{action.label}</span>
            </a>
          )
        }

        return (
          <button key={i} onClick={action.onClick} disabled={action.disabled} className={className} style={baseStyle}>
            {action.icon}
            <span>{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
