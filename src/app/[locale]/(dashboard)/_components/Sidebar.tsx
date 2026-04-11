'use client'

import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Briefcase, Calendar, Smartphone, Receipt, Settings, Users
} from 'lucide-react'

export default function Sidebar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = locale === 'en' ? 'es' : 'en'
  const switchHref = pathname.replace(`/${locale}`, `/${otherLocale}`)

  const nav = [
    { href: `/${locale}/dashboard`, label: t('dashboard'), icon: LayoutDashboard },
    { href: `/${locale}/clients`, label: 'Clients', icon: Users },
    { href: `/${locale}/jobs`, label: t('jobs'), icon: Briefcase },
    { href: `/${locale}/estimates`, label: t('estimates'), icon: FileText },
    { href: `/${locale}/invoices`, label: t('invoices'), icon: Receipt },
    { href: `/${locale}/schedule`, label: t('schedule'), icon: Calendar },
    { href: `/${locale}/field`, label: t('field'), icon: Smartphone },
    { href: `/${locale}/team`, label: 'Team', icon: Users },
  ]

  return (
    <aside className="w-60 shrink-0 plumbr-nav flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">Plumbr</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <Link href={`/${locale}/settings`} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors">
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
          className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors uppercase tracking-wide"
        >
          {otherLocale}
        </Link>
      </div>
    </aside>
  )
}
