'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleCancel() {
    setVisible(false)
    setTimeout(onCancel, 150)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.4)', opacity: visible ? 1 : 0 }}
        onClick={handleCancel}
      />
      <div
        className="relative rounded-xl p-6 max-w-sm w-full mx-4 transition-all duration-200"
        style={{
          background: 'var(--wp-bg-primary)',
          boxShadow: 'var(--wp-shadow-xl)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--wp-error-bg)' }}>
            <Trash2 size={18} style={{ color: 'var(--wp-error)' }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--wp-text-primary)' }}>{title}</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--wp-text-secondary)' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={handleCancel} className="btn-secondary text-sm px-4">Cancel</button>
          <button onClick={onConfirm} className="btn-danger text-sm px-4 py-2">Delete</button>
        </div>
      </div>
    </div>
  )
}
