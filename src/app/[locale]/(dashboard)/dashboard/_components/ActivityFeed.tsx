'use client'

import { useState } from 'react'
import { Eye, CheckCircle2, AlertTriangle, CreditCard, FileText, X } from 'lucide-react'

type ActivityItem = {
  id: string
  type: 'view' | 'approved' | 'paid' | 'overdue' | 'completed'
  title: string
  timestamp: Date
  read: boolean
}

const ICONS: Record<string, React.ReactNode> = {
  view: <Eye size={14} className="text-blue-500" />,
  approved: <CheckCircle2 size={14} className="text-emerald-500" />,
  paid: <CreditCard size={14} className="text-green-500" />,
  overdue: <AlertTriangle size={14} className="text-red-500" />,
  completed: <FileText size={14} className="text-purple-500" />,
}

function formatTime(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const [showAll, setShowAll] = useState(false)

  if (items.length === 0) return null

  const displayed = showAll ? items : items.slice(0, 8)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--wp-text-primary)' }}>Activity Feed</h3>
        {items.length > 8 && (
          <button onClick={() => setShowAll(!showAll)} className="text-xs hover:underline" style={{ color: 'var(--wp-accent)' }}>
            {showAll ? 'Show less' : `View all (${items.length})`}
          </button>
        )}
      </div>
      <div className="space-y-0">
        {displayed.map(item => (
          <div key={item.id} className="flex items-start gap-3 py-2.5 last:border-0" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <div className="mt-0.5 shrink-0">{ICONS[item.type] || <Eye size={14} style={{ color: 'var(--wp-text-muted)' }} />}</div>
            <p className="text-sm flex-1" style={{ color: 'var(--wp-text-secondary)' }}>{item.title}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>{formatTime(item.timestamp)}</span>
              {!item.read && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
