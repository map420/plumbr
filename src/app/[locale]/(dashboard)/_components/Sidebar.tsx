'use client'

import React from 'react'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Briefcase, Calendar, Wrench, Receipt, Settings, Users, X, Lock
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = locale === 'en' ? 'es' : 'en'
  const switchHref = pathname.replace(`/${locale}`, `/${otherLocale}`)

  const nav: { href: string; label: string; icon: React.ElementType; locked?: boolean }[] = [
    { href: `/${locale}/dashboard`, label: t('dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/clients`, label: 'Clients', icon: Users },
    { href: `/${locale}/jobs`, label: t('jobs'), icon: Briefcase },
    { href: `/${locale}/estimates`, label: t('estimates'), icon: FileText },
    { href: `/${locale}/invoices`, label: t('invoices'), icon: Receipt },
    { href: `/${locale}/schedule`, label: t('schedule'), icon: Calendar },
    { href: `/${locale}/field`, label: t('field'), icon: Wrench },
    { href: `/${locale}/team`, label: 'Team', icon: Users, locked: true },
  ]

  return (
    <aside className="w-60 h-full plumbr-nav flex flex-col">
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">Plumbr</span>
        <div className="flex items-center gap-1">
          <NotificationBell />
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1.5 text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, locked }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {locked && <Lock size={12} className="text-white/30" />}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 pb-2">
        <Link href={`/${locale}/settings`} onClick={onClose} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(`/${locale}/settings`) ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
          <Settings size={18} />
          Settings
        </Link>
      </div>
      <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-white/60">{t('account')}</span>
        </div>
        <Link
          href={switchHref}
          className="flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white/90 transition-colors border border-white/20 hover:border-white/40 rounded px-2 py-0.5"
          title={`Switch to ${otherLocale === 'en' ? 'English' : 'Español'}`}
        >
          <span className="uppercase tracking-wide">{locale}</span>
          <span className="text-white/30">→</span>
          <span className="uppercase tracking-wide text-white/30 hover:text-white/70">{otherLocale}</span>
        </Link>
      </div>
    </aside>
  )
}
