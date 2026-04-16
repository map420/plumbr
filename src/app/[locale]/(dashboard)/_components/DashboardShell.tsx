'use client'

import { Bot, Plus, Search } from 'lucide-react'
import { PullToRefresh } from '@/components/PullToRefresh'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { NotificationBell } from './NotificationBell'

// Maps URL path to page title, create route (route push) OR create event
// (window.dispatchEvent) for in-page modal creators like shopping list.
const PAGE_CONFIG: Record<string, { title: string; titleEs?: string; createRoute?: string; createEvent?: string }> = {
  dashboard: { title: 'Dashboard', titleEs: 'Inicio' },
  estimates: { title: 'Estimates', titleEs: 'Presupuestos', createRoute: '/estimates/new' },
  invoices: { title: 'Invoices', titleEs: 'Facturas', createRoute: '/invoices/new' },
  clients: { title: 'Clients', titleEs: 'Clientes', createRoute: '/clients/new' },
  jobs: { title: 'Jobs', titleEs: 'Trabajos', createRoute: '/jobs/new' },
  schedule: { title: 'Schedule', titleEs: 'Calendario' },
  field: { title: 'Field', titleEs: 'Campo' },
  team: { title: 'Team', titleEs: 'Equipo', createRoute: '/team/new' },
  expenses: { title: 'Expenses', titleEs: 'Gastos' },
  payments: { title: 'Payments', titleEs: 'Pagos' },
  settings: { title: 'Settings', titleEs: 'Configuración' },
  assistant: { title: 'AI Assistant', titleEs: 'Asistente IA' },
  'shopping-list': { title: 'Shopping List', titleEs: 'Lista de Compras', createEvent: 'shopping-list:new' },
}

function MobileHeader() {
  const pathname = usePathname()
  const locale = useLocale()
  const router = useRouter()

  const segments = pathname.split('/').filter(Boolean)
  const pageSegment = segments.find(s => PAGE_CONFIG[s]) || 'dashboard'
  const config = PAGE_CONFIG[pageSegment] || { title: 'WorkPilot' }
  const title = locale === 'es' && config.titleEs ? config.titleEs : config.title
  const createRoute = config.createRoute ? `/${locale}${config.createRoute}` : null
  const createEvent = config.createEvent ?? null
  const showCreate = Boolean(createRoute || createEvent)

  function handleCreate() {
    if (createRoute) router.push(createRoute)
    else if (createEvent) window.dispatchEvent(new CustomEvent(createEvent))
  }

  // Sub-pages (detail, edit, print) use their own headers
  const lastSegment = segments[segments.length - 1]
  const isSubPage = segments.length > 2 && !['new'].includes(lastSegment)

  if (isSubPage || pageSegment === 'assistant') return null

  return (
    <header className="flex items-center justify-between px-4 py-2.5 md:hidden" style={{ background: 'var(--wp-bg-primary)', borderBottom: '1px solid var(--wp-border-light)' }}>
      {/* Left: AI bot */}
      <button
        onClick={() => router.push(`/${locale}/assistant`)}
        className="p-1.5"
        style={{ color: 'var(--wp-primary)' }}
        title="AI Assistant"
      >
        <Bot size={22} />
      </button>

      {/* Center: Page title */}
      <span className="text-base font-semibold" style={{ color: 'var(--wp-text-primary)' }}>{title}</span>

      {/* Right: Search + Bell + Create */}
      <div className="flex items-center">
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))} className="p-1.5" style={{ color: 'var(--wp-primary)' }} title="Search">
          <Search size={20} />
        </button>
        <NotificationBell variant="light" />
        {showCreate && (
          <button onClick={handleCreate} className="p-1.5" style={{ color: 'var(--wp-primary)' }}>
            <Plus size={22} />
          </button>
        )}
      </div>
    </header>
  )
}

export default function DashboardShell({ children, pro }: { children: React.ReactNode; pro: boolean }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar pro={pro} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader />

        <main className="flex-1 overflow-auto pb-16 md:pb-0" style={{ background: 'var(--wp-bg-secondary)' }}>
          <PullToRefresh className="min-h-full">
            {children}
          </PullToRefresh>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
