'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Briefcase, Calendar, Wrench, Receipt, Settings, Users, X, Lock, CreditCard, BookOpen, ShoppingCart
} from 'lucide-react'
import { SparkleIcon } from '@/components/icons/SparkleIcon'
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
        { href: `/${locale}/projects`, label: t('jobs'), icon: Briefcase },
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
  ]

  // Theme-aware colors: tokens auto-swap between light/dark via CSS vars
  const textInactive = 'var(--wp-text-3)'
  const textActive = 'var(--wp-text)'
  const hoverBg = 'var(--wp-surface-3)'
  const activeBg = 'var(--wp-surface)'
  const borderC = 'var(--wp-border-v2)'
  const groupLabelC = 'var(--wp-text-4)'

  return (
    <aside className="w-60 h-full plumbr-nav flex flex-col">
      <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderC}` }}>
        <span className="text-xl font-bold tracking-tight" style={{ color: textActive }}>WorkPilot</span>
        <div className="flex items-center gap-1">
          <span className="hidden md:block"><NotificationBell /></span>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1.5" style={{ color: textInactive }} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: groupLabelC }}>
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
                    className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={isActive ? {
                      background: activeBg,
                      border: `1px solid ${borderC}`,
                      color: textActive,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 2px 0 0 var(--wp-cta)',
                    } : {
                      color: textInactive,
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = textActive } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = ''; e.currentTarget.style.color = textInactive } }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {locked && <Lock size={12} style={{ color: textInactive, opacity: 0.6 }} />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 pb-2">
        <Link
          href={`/${locale}/assistant`}
          onClick={onClose}
          className="group relative flex items-start gap-2.5 px-3 py-2.5 rounded-lg transition-all overflow-hidden hover:brightness-110"
          style={{
            background: 'var(--wp-ai-bg)',
            border: '1px solid var(--wp-ai-border)',
            color: 'var(--wp-ai-text)',
            boxShadow: pathname.startsWith(`/${locale}/assistant`)
              ? '0 0 24px var(--wp-ai-glow), 0 0 0 1px var(--wp-ai)'
              : '0 0 16px rgba(14, 165, 233, 0.12)',
          }}
          aria-label={locale === 'es' ? 'Asistente IA — Nuevo' : 'AI Assistant — New'}
        >
          <span
            className="mt-0.5 shrink-0 w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--wp-ai-strong)', boxShadow: '0 0 14px var(--wp-ai-glow)' }}
          >
            <SparkleIcon size={14} className="text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5 leading-tight">
              <span className="text-sm font-semibold" style={{ color: 'var(--wp-ai-strong)' }}>AI</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'var(--wp-cta)', color: 'var(--wp-brand-text)' }}>NEW</span>
            </span>
            <span className="block text-sm font-semibold leading-tight mt-0.5" style={{ color: 'var(--wp-ai-strong)' }}>{locale === 'es' ? 'Asistente' : 'Assistant'}</span>
            <span className="block text-[10px] mt-1" style={{ color: 'var(--wp-ai-text-soft)' }}>
              {locale === 'es' ? 'Borrar · analizar · preguntar' : 'Draft · analyze · ask'}
            </span>
          </span>
        </Link>
      </div>
      <div className="px-3 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${borderC}` }}>
        <Link
          href={`/${locale}/settings`}
          onClick={onClose}
          className="relative flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={pathname.startsWith(`/${locale}/settings`) ? {
            background: activeBg,
            border: `1px solid ${borderC}`,
            color: textActive,
            boxShadow: '0 1px 2px rgba(0,0,0,0.08), inset 2px 0 0 var(--wp-cta)',
          } : { color: textInactive }}
          aria-current={pathname.startsWith(`/${locale}/settings`) ? 'page' : undefined}
        >
          <Settings size={18} />
          {locale === 'es' ? 'Configuración' : 'Settings'}
        </Link>
        <Link
          href={switchHref}
          className="flex items-center gap-1 text-xs font-medium transition-colors rounded px-2 py-0.5"
          style={{ color: textInactive, border: `1px solid ${borderC}` }}
          title={`Switch to ${otherLocale === 'en' ? 'English' : 'Español'}`}
        >
          <span className="uppercase tracking-wide">{locale}</span>
          <span style={{ opacity: 0.4 }}>→</span>
          <span className="uppercase tracking-wide" style={{ opacity: 0.6 }}>{otherLocale}</span>
        </Link>
      </div>
    </aside>
  )
}
