'use client'

import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

const VARIANTS = {
  success: { icon: CheckCircle, iconColor: 'var(--wp-success)', bg: 'var(--wp-text-primary)' },
  error: { icon: XCircle, iconColor: '#f87171', bg: '#991b1b' },
  warning: { icon: AlertTriangle, iconColor: '#fbbf24', bg: '#78350f' },
} as const

export function Toast({ message, onDone, variant = 'success' }: { message: string; onDone: () => void; variant?: 'success' | 'error' | 'warning' }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  const v = VARIANTS[variant]
  const Icon = v.icon

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2 text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ background: v.bg }}
    >
      <Icon size={16} className="shrink-0" style={{ color: v.iconColor }} />
      {message}
    </div>
  )
}
