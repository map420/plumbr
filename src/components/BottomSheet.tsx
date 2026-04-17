'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

export function BottomSheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--wp-border)' }} />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--wp-text-primary)' }}>{title}</h3>
            <button onClick={onClose} className="p-1 transition-colors" style={{ color: 'var(--wp-text-muted)' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="pb-[env(safe-area-inset-bottom,16px)]">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}
