'use client'

import { useEffect, useState } from 'react'
import { Trash2, FileText } from 'lucide-react'

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText, tone = 'danger' }: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  tone?: 'danger' | 'primary'
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleCancel() {
    setVisible(false)
    setTimeout(onCancel, 150)
  }

  const isDanger = tone === 'danger'
  const Icon = isDanger ? Trash2 : FileText
  const iconBg = isDanger ? 'var(--wp-error-bg)' : 'var(--wp-info-bg-v2)'
  const iconColor = isDanger ? 'var(--wp-error)' : 'var(--wp-brand)'
  const btnClass = isDanger ? 'btn-danger' : 'btn-primary'
  const label = confirmText ?? (isDanger ? 'Delete' : 'Confirm')

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
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: iconBg }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--wp-text-primary)' }}>{title}</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--wp-text-secondary)' }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={handleCancel} className="btn-secondary text-sm px-4">Cancel</button>
          <button onClick={onConfirm} className={`${btnClass} text-sm px-4 py-2`}>{label}</button>
        </div>
      </div>
    </div>
  )
}
