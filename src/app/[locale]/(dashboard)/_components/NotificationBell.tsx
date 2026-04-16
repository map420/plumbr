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

export function NotificationBell({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
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

    // Anchor panel: desktop → right of sidebar; mobile → below header
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const sidebar = buttonRef.current.closest('aside')
      if (sidebar) {
        const sidebarRight = sidebar.getBoundingClientRect().right
        setPanelPos({ top: rect.top, left: sidebarRight + 8 })
      } else {
        setPanelPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 360) })
      }
    }

    setFetching(true)
    try {
      const list = await getNotifications()
      setNotifications(list)
      setLoaded(true)
    } catch {
      setLoaded(true)
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

  const unreadLabel = unread > 9 ? '9+' : String(unread)
  const ariaLabel = unread > 0 ? `Notifications, ${unreadLabel} unread` : 'Notifications'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        className={`relative p-1.5 rounded-lg transition-colors ${
          variant === 'light'
            ? (open || fetching ? 'opacity-70' : 'opacity-60 hover:opacity-100')
            : (open || fetching ? 'text-white bg-white/15' : 'text-white/60 hover:text-white hover:bg-white/10')
        }`}
        style={variant === 'light' ? { color: 'var(--wp-primary)' } : undefined}
      >
        {fetching
          ? <Loader2 size={18} className="animate-spin" />
          : <Bell size={18} />
        }
        {unread > 0 && !fetching && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none" style={{ background: 'var(--wp-accent)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
        <div className="fixed inset-0 z-[9998]" onClick={closePanel} />
        <div
          ref={panelRef}
          className={`fixed z-[9999] w-[calc(100vw-16px)] sm:w-[360px] rounded-xl border overflow-hidden transition-all duration-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
          style={{ top: panelPos.top, left: panelPos.left, borderColor: 'var(--wp-border)', boxShadow: 'var(--wp-shadow-xl)', background: 'var(--wp-bg-primary)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--wp-text-primary)' }}>Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={handleMarkAllRead} title="Mark all read" className="transition-colors" style={{ color: 'var(--wp-text-muted)' }}>
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={closePanel} className="transition-colors" style={{ color: 'var(--wp-text-muted)' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--wp-border)' }} />
                <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const Icon = TYPE_ICON[n.type] ?? Bell
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{
                      borderBottom: '1px solid var(--wp-border-light)',
                      background: n.read ? 'transparent' : 'color-mix(in srgb, var(--wp-info-bg) 40%, transparent)',
                    }}
                  >
                    <div
                      className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                      style={{
                        background: n.read ? 'var(--wp-bg-muted)' : 'color-mix(in srgb, var(--wp-primary) 10%, transparent)',
                        color: n.read ? 'var(--wp-text-muted)' : 'var(--wp-primary)',
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <Link href={n.href} onClick={() => { handleMarkRead(n.id); closePanel() }} className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: n.read ? 'var(--wp-text-secondary)' : 'var(--wp-text-primary)', fontWeight: n.read ? 400 : 500 }}>{n.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--wp-text-muted)' }}>{n.body}</p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--wp-border)' }}>{timeAgo(n.createdAt)}</p>
                    </Link>
                    {!n.read && (
                      <button onClick={() => handleMarkRead(n.id)} className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--wp-accent)' }} title="Mark as read" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
        </>
      )}
    </>
  )
}
