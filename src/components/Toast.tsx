'use client'

import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
      <CheckCircle size={16} className="text-green-400 shrink-0" />
      {message}
    </div>
  )
}
