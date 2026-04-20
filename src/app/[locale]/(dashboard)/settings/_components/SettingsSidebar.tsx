'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  User, Building2, CreditCard,
  Bell, Plug, Palette,
  FileText, BookOpen,
} from 'lucide-react'
import { SparkleIcon } from '@/components/icons/SparkleIcon'

export type SettingsTabId =
  | 'account' | 'company' | 'billing'
  | 'notifications' | 'appearance' | 'ai' | 'integrations'
  | 'templates' | 'catalog'

type NavItem = {
  key: SettingsTabId
  label: { en: string; es: string }
  icon: LucideIcon
  href?: string
}

type NavGroup = {
  label: { en: string; es: string }
  items: NavItem[]
}

function getGroups(locale: string): NavGroup[] {
  return [
    {
      label: { en: 'ACCOUNT', es: 'CUENTA' },
      items: [
        { key: 'account', label: { en: 'Profile', es: 'Perfil' }, icon: User },
        { key: 'company', label: { en: 'Company', es: 'Empresa' }, icon: Building2 },
        { key: 'billing', label: { en: 'Billing & plan', es: 'Facturación y plan' }, icon: CreditCard },
      ],
    },
    {
      label: { en: 'PREFERENCES', es: 'PREFERENCIAS' },
      items: [
        { key: 'notifications', label: { en: 'Notifications', es: 'Notificaciones' }, icon: Bell },
        { key: 'appearance', label: { en: 'Appearance', es: 'Apariencia' }, icon: Palette },
        { key: 'ai', label: { en: 'AI preferences', es: 'AI preferences' }, icon: SparkleIcon as unknown as LucideIcon },
        { key: 'integrations', label: { en: 'Integrations', es: 'Integraciones' }, icon: Plug },
      ],
    },
    {
      label: { en: 'WORKSPACE', es: 'ESPACIO DE TRABAJO' },
      items: [
        { key: 'templates', label: { en: 'Templates', es: 'Plantillas' }, icon: FileText },
        { key: 'catalog', label: { en: 'Item catalog', es: 'Catálogo' }, icon: BookOpen },
      ],
    },
  ]
}

export function SettingsSidebar({
  activeKey, onChange, locale,
}: {
  activeKey: SettingsTabId
  onChange: (key: SettingsTabId) => void
  locale: string
}) {
  const es = locale === 'es'
  const groups = getGroups(locale)

  return (
    <nav
      className="rounded-xl p-3 md:p-4 space-y-5 sticky top-4"
      style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)' }}
    >
      {groups.map((group, gi) => (
        <div key={gi}>
          <div
            className="text-[10px] font-semibold tracking-wider mb-2 px-2"
            style={{ color: 'var(--wp-text-3)' }}
          >
            {es ? group.label.es : group.label.en}
          </div>
          <div className="space-y-0.5">
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = activeKey === item.key
              const base = 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left'
              const style = {
                background: isActive ? 'var(--wp-text)' : 'transparent',
                color: isActive ? 'var(--wp-text-inverse)' : 'var(--wp-text-2)',
              }
              return item.href ? (
                <Link key={item.key} href={item.href} className={base} style={style}>
                  <Icon size={15} />
                  {es ? item.label.es : item.label.en}
                </Link>
              ) : (
                <button
                  key={item.key}
                  onClick={() => onChange(item.key)}
                  className={base}
                  style={style}
                >
                  <Icon size={15} />
                  {es ? item.label.es : item.label.en}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
