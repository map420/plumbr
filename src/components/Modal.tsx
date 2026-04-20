'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title, subtitle, onClose, children, footer, size = 'md',
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 150)
  }

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />
      <div
        className={`relative rounded-xl w-full ${maxWidth} transition-all duration-200 my-8`}
        style={{
          background: 'var(--wp-surface)',
          boxShadow: 'var(--wp-elevation-3, 0 25px 50px -12px rgba(0,0,0,0.25))',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.96)',
          border: '1px solid var(--wp-border-v2)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="min-w-0">
            <h2 className="text-base font-semibold" style={{ color: 'var(--wp-text)' }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>{subtitle}</p>}
          </div>
          <button onClick={handleClose} className="p-1 -m-1 rounded hover:bg-[var(--wp-surface-2)]" style={{ color: 'var(--wp-text-3)' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ background: 'var(--wp-surface-2)', borderTop: '1px solid var(--wp-border-light)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
