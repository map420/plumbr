'use client'

import { Trash2 } from 'lucide-react'

export function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm px-4">Cancel</button>
          <button onClick={onConfirm} className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
