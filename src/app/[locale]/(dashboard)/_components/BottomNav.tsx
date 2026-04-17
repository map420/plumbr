'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  FileText, Receipt, Users, CreditCard, MoreHorizontal,
  LayoutDashboard, Briefcase, Calendar, Wrench, UserCog,
  Wallet, Settings, Bot, ClipboardList, ShoppingCart,
} from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'

export default function BottomNav() {
  const pathname = usePathname()
  const locale = useLocale()
  const [showMore, setShowMore] = useState(false)

  const items = [
    { href: `/${locale}/dashboard`, label: locale === 'es' ? 'Inicio' : 'Dashboard', icon: LayoutDashboard },
    { href: `/${locale}/estimates`, label: locale === 'es' ? 'Presupuestos' : 'Estimates', icon: FileText },
    { href: `/${locale}/invoices`, label: locale === 'es' ? 'Facturas' : 'Invoices', icon: Receipt },
    { href: `/${locale}/clients`, label: locale === 'es' ? 'Clientes' : 'Clients', icon: Users },
  ]

  const moreItems = [
    { href: `/${locale}/assistant`, label: locale === 'es' ? 'Asistente IA' : 'AI Assistant', icon: Bot },
    { href: `/${locale}/jobs`, label: locale === 'es' ? 'Trabajos' : 'Jobs', icon: Briefcase },
    { href: `/${locale}/schedule`, label: locale === 'es' ? 'Calendario' : 'Schedule', icon: Calendar },
    { href: `/${locale}/field`, label: locale === 'es' ? 'Campo' : 'Field', icon: Wrench },
    { href: `/${locale}/team`, label: locale === 'es' ? 'Equipo' : 'Team', icon: UserCog },
    { href: `/${locale}/payments`, label: locale === 'es' ? 'Pagos' : 'Payments', icon: CreditCard },
    { href: `/${locale}/expenses`, label: locale === 'es' ? 'Gastos' : 'Expenses', icon: Wallet },
    { href: `/${locale}/shopping-list`, label: locale === 'es' ? 'Compras' : 'Shopping', icon: ShoppingCart },
    { href: `/${locale}/settings`, label: locale === 'es' ? 'Configuración' : 'Settings', icon: Settings },
  ]

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-stretch pb-[env(safe-area-inset-bottom,0px)]" style={{ background: 'var(--wp-bg-primary)', borderTop: '1px solid var(--wp-border)' }}>
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
            >
              <span
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
                style={{
                  background: isActive ? 'color-mix(in srgb, var(--wp-primary) 10%, transparent)' : 'transparent',
                  color: isActive ? 'var(--wp-primary)' : 'var(--wp-text-muted)',
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </span>
            </Link>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
        >
          <span
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
            style={{
              background: showMore ? 'color-mix(in srgb, var(--wp-primary) 10%, transparent)' : 'transparent',
              color: showMore ? 'var(--wp-primary)' : 'var(--wp-text-muted)',
            }}
          >
            <MoreHorizontal size={20} strokeWidth={1.8} />
            {locale === 'es' ? 'Más' : 'More'}
          </span>
        </button>
      </nav>

      {/* More menu bottom sheet */}
      <BottomSheet open={showMore} onClose={() => setShowMore(false)} title={locale === 'es' ? 'Más' : 'More'}>
        <div className="py-2">
          {moreItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? 'var(--wp-primary)' : 'var(--wp-text-primary)',
                  background: isActive ? 'var(--wp-bg-secondary)' : 'transparent',
                }}
              >
                <Icon size={20} style={{ color: isActive ? 'var(--wp-primary)' : 'var(--wp-text-muted)' }} />
                {label}
                <svg className="ml-auto" style={{ color: 'var(--wp-border)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
