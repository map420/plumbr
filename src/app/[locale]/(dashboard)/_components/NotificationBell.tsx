'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Bell, X, CheckCheck, FileText, Briefcase, Receipt, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/adapters/db/types'

const TYPE_ICON: Record<string, React.ElementType> = {
  invoice_paid: Receipt,
  invoice_overdue: AlertCircle,
  estimate_approved: FileText,
  job_completed_no_invoice: Briefcase,
}

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll unread count every 60s
  useEffect(() => {
    let cancelled = false
    async function poll() {
      const cnt = await getUnreadCount()
      if (!cancelled) setUnread(cnt)
    }
    poll()
    const interval = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function toggleOpen() {
    if (!open) {
      const list = await getNotifications()
      setNotifications(list)
      setLoaded(true)
    }
    setOpen(o => !o)
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id)
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
      setUnread(u => Math.max(0, u - 1))
    })
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
      setNotifications(ns => ns.map(n => ({ ...n, read: true })))
      setUnread(0)
    })
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} title="Mark all read" className="text-slate-400 hover:text-[#1E3A5F] transition-colors">
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Bell
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${n.read ? '' : 'bg-blue-50/40'}`}>
                    <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${n.read ? 'bg-slate-100 text-slate-400' : 'bg-[#1E3A5F]/10 text-[#1E3A5F]'}`}>
                      <Icon size={13} />
                    </div>
                    <Link href={n.href} onClick={() => { handleMarkRead(n.id); setOpen(false) }} className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>{n.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{n.body}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</p>
                    </Link>
                    {!n.read && (
                      <button onClick={() => handleMarkRead(n.id)} className="mt-1 w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" title="Mark as read" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
