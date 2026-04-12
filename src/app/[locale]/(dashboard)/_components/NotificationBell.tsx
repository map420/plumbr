'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Bell, X, CheckCheck, FileText, Briefcase, Receipt, AlertCircle, Loader2 } from 'lucide-react'
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
  const [visible, setVisible] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const [, startTransition] = useTransition()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll unread count every 60s
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const cnt = await getUnreadCount()
        if (!cancelled) setUnread(cnt)
      } catch { /* table may not exist yet */ }
    }
    poll()
    const interval = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  // Close on outside click or ESC
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) closePanel()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate in after mount
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [open])

  function closePanel() {
    setVisible(false)
    setTimeout(() => setOpen(false), 150)
  }

  async function toggleOpen() {
    if (open) { closePanel(); return }

    // Anchor panel to the right of the sidebar, aligned with button vertically
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Find sidebar right edge (button's parent aside)
      const sidebar = buttonRef.current.closest('aside')
      const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right : rect.right
      setPanelPos({ top: rect.top, left: sidebarRight + 8 })
    }

    setFetching(true)
    try {
      const list = await getNotifications()
      setNotifications(list)
      setLoaded(true)
    } catch {
      setLoaded(true) // show empty state instead of infinite spinner
    } finally {
      setFetching(false)
      setOpen(true)
    }
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

  const ariaLabel = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className={`relative p-1.5 rounded-lg transition-colors ${open || fetching ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
      >
        {fetching
          ? <Loader2 size={18} className="animate-spin" />
          : <Bell size={18} />
        }
        {unread > 0 && !fetching && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F97316] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ top: panelPos.top, left: panelPos.left }}
          className={`fixed z-[9999] w-[360px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} title="Mark all read" className="text-slate-400 hover:text-[#1E3A5F] transition-colors">
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
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
                    <Link href={n.href} onClick={() => { handleMarkRead(n.id); closePanel() }} className="flex-1 min-w-0">
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
    </>
  )
}
