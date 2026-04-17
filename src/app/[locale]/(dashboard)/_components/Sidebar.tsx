'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Briefcase, Calendar, Wrench, Receipt, Settings, Users, X, Lock, CreditCard, BookOpen, Bot, ShoppingCart
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

export default function Sidebar({ onClose, pro }: { onClose?: () => void; pro?: boolean }) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = locale === 'en' ? 'es' : 'en'
  const switchHref = pathname.replace(`/${locale}`, `/${otherLocale}`)

  type NavItem = { href: string; label: string; icon: React.ElementType; locked?: boolean }
  type NavGroup = { label: string | null; items: NavItem[] }

  const navGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { href: `/${locale}/dashboard`, label: t('dashboard'), icon: LayoutDashboard },
      ],
    },
    {
      label: locale === 'es' ? 'Operaciones' : 'Operations',
      items: [
        { href: `/${locale}/clients`, label: locale === 'es' ? 'Clientes' : 'Clients', icon: Users },
        { href: `/${locale}/jobs`, label: t('jobs'), icon: Briefcase },
      ],
    },
    {
      label: locale === 'es' ? 'Finanzas' : 'Finance',
      items: [
        { href: `/${locale}/estimates`, label: t('estimates'), icon: FileText },
        { href: `/${locale}/invoices`, label: t('invoices'), icon: Receipt },
        { href: `/${locale}/expenses`, label: locale === 'es' ? 'Gastos' : 'Expenses', icon: CreditCard },
        { href: `/${locale}/shopping-list`, label: locale === 'es' ? 'Compras' : 'Shopping List', icon: ShoppingCart },
      ],
    },
    {
      label: locale === 'es' ? 'Campo y Equipo' : 'Field & Team',
      items: [
        { href: `/${locale}/schedule`, label: t('schedule'), icon: Calendar },
        { href: `/${locale}/field`, label: t('field'), icon: Wrench },
        { href: `/${locale}/team`, label: locale === 'es' ? 'Equipo' : 'Team', icon: Users, locked: !pro },
      ],
    },
    // Referrals — route exists at /referrals but hidden from nav until the
    // signup-attribution + reward flow is wired end-to-end.
  ]

  return (
    <aside className="w-60 h-full plumbr-nav flex flex-col">
      <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">WorkPilot</span>
        <div className="flex items-center gap-1">
          <span className="hidden md:block"><NotificationBell /></span>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1.5 text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, locked }) => {
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
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <Link href={`/${locale}/assistant`} onClick={onClose} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(`/${locale}/assistant`) ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
          <Bot size={18} />
          {locale === 'es' ? 'Asistente IA' : 'AI Assistant'}
        </Link>
      </div>
      <div className="px-3 py-3 border-t border-white/10 flex items-center justify-between">
        <Link href={`/${locale}/settings`} onClick={onClose} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(`/${locale}/settings`) ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
          <Settings size={18} />
          {locale === 'es' ? 'Configuración' : 'Settings'}
        </Link>
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
