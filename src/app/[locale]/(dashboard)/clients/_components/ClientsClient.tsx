'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { formatCurrencyCompact } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/lib/actions/clients'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Users, Plus, Trash2, Mail, Phone, Briefcase, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'
import {
  KpiCard, ClientAvatar, Toolbar, Segmented, EmptyState,
} from '@/components/ui'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }
type ClientStats = { jobCount: number; revenue: number }
type SortKey = 'name' | 'jobs' | 'revenue'
type View = 'grid' | 'table'
type FilterValue = 'all' | 'active' | 'withBalance'

export function ClientsClient({ initialClients, clientStats = {} }: { initialClients: Client[]; clientStats?: Record<string, ClientStats> }) {
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // KPIs
  const total = initialClients.length
  const activeClients = initialClients.filter(c => (clientStats[c.id]?.jobCount ?? 0) > 0)
  const totalRevenue = Object.values(clientStats).reduce((s, st) => s + (st?.revenue ?? 0), 0)
  const avgLTV = initialClients.length > 0 ? totalRevenue / initialClients.length : 0
  const topClient = [...initialClients].sort((a, b) => (clientStats[b.id]?.revenue ?? 0) - (clientStats[a.id]?.revenue ?? 0))[0]

  const filtered = initialClients
    .filter(c => {
      if (filter === 'active' && (clientStats[c.id]?.jobCount ?? 0) === 0) return false
      if (filter === 'withBalance' && (clientStats[c.id]?.jobCount ?? 0) > 0) return false
      return c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    })
    .sort((a, b) => {
      let av = 0, bv = 0
      if (sortKey === 'name') return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      if (sortKey === 'jobs') { av = clientStats[a.id]?.jobCount ?? 0; bv = clientStats[b.id]?.jobCount ?? 0 }
      if (sortKey === 'revenue') { av = clientStats[a.id]?.revenue ?? 0; bv = clientStats[b.id]?.revenue ?? 0 }
      return sortDir === 'asc' ? av - bv : bv - av
    })

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteClient(deleteId); router.refresh() })
    setDeleteId(null)
  }

  const inactiveCount = initialClients.filter(c => (clientStats[c.id]?.jobCount ?? 0) === 0).length
  const filterOptions = [
    { value: 'all' as FilterValue, label: locale === 'es' ? 'Todos' : 'All', count: total },
    { value: 'active' as FilterValue, label: locale === 'es' ? 'Activos' : 'Active', count: activeClients.length },
    { value: 'withBalance' as FilterValue, label: locale === 'es' ? 'Inactivos' : 'Inactive', count: inactiveCount },
  ]

  // Alphabetical grouping for table view
  const alphabetGroups = (() => {
    const groups: Record<string, typeof filtered> = {}
    for (const c of filtered) {
      const letter = c.name.charAt(0).toUpperCase()
      if (!groups[letter]) groups[letter] = []
      groups[letter].push(c)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  })()

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full">
      {deleteId && (
        <ConfirmModal
          title="Delete Client"
          message="Are you sure you want to delete this client? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Desktop header */}
      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">{locale === 'es' ? 'Clientes' : 'Clients'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {total} {locale === 'es' ? 'total' : 'total'}
            {activeClients.length > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-success-v2)', fontWeight: 500 }}>
                  {activeClients.length}
                </span>
                {' '}
                {locale === 'es' ? 'activos' : 'active'}
              </>
            )}
            {totalRevenue > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-text)', fontWeight: 500 }}>
                  ${formatCurrencyCompact(totalRevenue)}
                </span>
                {' '}
                {locale === 'es' ? 'facturado' : 'billed'}
              </>
            )}
          </p>
        </div>
        <Link href={`/${locale}/clients/new`} className="btn-primary btn-sm">
          <Plus size={14} /> {locale === 'es' ? 'Nuevo cliente' : 'New Client'}
        </Link>
      </div>

      {/* KPI row */}
      {total > 0 && (
        <div className="hidden md:grid grid-cols-4 gap-2.5 mb-5">
          <KpiCard
            tone="info"
            label={locale === 'es' ? 'Total clientes' : 'Total clients'}
            value={total}
            sub={locale === 'es' ? 'Directorio completo' : 'Full directory'}
          />
          <KpiCard
            tone="success"
            label={locale === 'es' ? 'Activos' : 'Active'}
            value={activeClients.length}
            sub={locale === 'es' ? 'Con jobs activos' : 'With active jobs'}
            subTone={activeClients.length > 0 ? 'up' : 'neutral'}
          />
          <KpiCard
            tone="brand"
            label={locale === 'es' ? 'LTV promedio' : 'Avg LTV'}
            value={avgLTV > 0 ? `$${formatCurrencyCompact(avgLTV)}` : '—'}
            sub={topClient && (clientStats[topClient.id]?.revenue ?? 0) > 0 ? `Top: ${topClient.name}` : undefined}
          />
          <KpiCard
            tone="warning"
            label={locale === 'es' ? 'Facturado total' : 'Total billed'}
            value={totalRevenue > 0 ? `$${formatCurrencyCompact(totalRevenue)}` : '$0'}
            sub={total > 0 ? `${total} ${locale === 'es' ? 'clientes' : 'clients'}` : undefined}
          />
        </div>
      )}

      {/* Mobile search */}
      <div className="md:hidden">
        <input
          type="text"
          placeholder={locale === 'es' ? 'Buscar clientes...' : 'Search clients...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
          style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text)' }}
        />
      </div>

      {/* Desktop toolbar */}
      <div className="hidden md:block">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={locale === 'es' ? 'Buscar por nombre, email o teléfono...' : 'Search by name, email or phone...'}
          right={
            <div className="flex items-center gap-2">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={filterOptions}
              />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="input text-xs py-1.5 pr-8 max-w-[140px]"
                style={{ height: 34, minHeight: 'auto' }}
              >
                <option value="name">{locale === 'es' ? 'Orden: Nombre' : 'Sort: Name'}</option>
                <option value="jobs">{locale === 'es' ? 'Orden: Jobs' : 'Sort: Jobs'}</option>
                <option value="revenue">{locale === 'es' ? 'Orden: Revenue' : 'Sort: Revenue'}</option>
              </select>
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-lg"
                style={{ border: '1px solid var(--wp-border-v2)', color: 'var(--wp-text-3)', background: 'var(--wp-surface)' }}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown size={14} className={`${sortDir === 'desc' ? 'rotate-180' : ''} transition-transform`} />
              </button>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--wp-border-v2)' }}>
                <button
                  onClick={() => setView('grid')}
                  className="p-2"
                  style={{ background: view === 'grid' ? 'var(--wp-brand)' : 'var(--wp-surface)', color: view === 'grid' ? 'white' : 'var(--wp-text-3)' }}
                  title="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setView('table')}
                  className="p-2"
                  style={{ background: view === 'table' ? 'var(--wp-brand)' : 'var(--wp-surface)', color: view === 'table' ? 'white' : 'var(--wp-text-3)' }}
                  title="Table view"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* Mobile list — grouped by active first, then ABC */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--wp-border-v2)' }} />
            <p className="text-sm" style={{ color: 'var(--wp-text-3)' }}>
              {locale === 'es' ? 'No hay clientes.' : 'No clients yet.'}
            </p>
          </div>
        ) : (() => {
          const withActive = filtered.filter(c => (clientStats[c.id]?.jobCount ?? 0) > 0)
          const withoutActive = filtered.filter(c => (clientStats[c.id]?.jobCount ?? 0) === 0)
          const sorted = [...withoutActive].sort((a, b) => a.name.localeCompare(b.name))

          const abcGroups = sorted.reduce<Record<string, Client[]>>((acc, c) => {
            const letter = c.name.charAt(0).toUpperCase()
            if (!acc[letter]) acc[letter] = []
            acc[letter].push(c)
            return acc
          }, {})
          const letters = Object.keys(abcGroups).sort()

          return (
            <div className="relative">
              {withActive.length > 0 && (
                <>
                  <div className="py-2 -mx-4 px-4" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-2)' }}>
                      {locale === 'es' ? 'Con proyectos activos' : 'Active Projects'}
                    </span>
                  </div>
                  {withActive.map((c, idx) => (
                    <SwipeableRow key={c.id} actions={[
                      { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error-v2)', onClick: () => setDeleteId(c.id) },
                    ]}>
                      <Link
                        href={`/${locale}/clients/${c.id}`}
                        className="flex items-center gap-3 py-3 border-b"
                        style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
                      >
                        <ClientAvatar name={c.name} size="md" />
                        <span className="text-sm flex-1" style={{ color: 'var(--wp-text)' }}>{c.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={12} style={{ color: 'var(--wp-brand)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'var(--wp-brand)' }}>{clientStats[c.id]?.jobCount}</span>
                        </div>
                      </Link>
                    </SwipeableRow>
                  ))}
                </>
              )}

              {letters.map(letter => (
                <div key={letter}>
                  <div className="py-2 -mx-4 px-4 mt-1" style={{ background: 'var(--wp-surface-2)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--wp-text-3)' }}>{letter}</span>
                  </div>
                  {abcGroups[letter].map((c, idx) => (
                    <SwipeableRow key={c.id} actions={[
                      { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error-v2)', onClick: () => setDeleteId(c.id) },
                    ]}>
                      <Link
                        href={`/${locale}/clients/${c.id}`}
                        className="flex items-center gap-3 py-3 border-b"
                        style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
                      >
                        <ClientAvatar name={c.name} size="md" />
                        <span className="text-sm flex-1" style={{ color: 'var(--wp-text)' }}>{c.name}</span>
                      </Link>
                    </SwipeableRow>
                  ))}
                </div>
              ))}

              <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center text-[8px] font-medium leading-tight" style={{ color: 'var(--wp-text-3)' }}>
                {letters.map(l => <span key={l}>{l}</span>)}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title={search ? (locale === 'es' ? 'Sin resultados' : 'No clients match your search.') : (locale === 'es' ? 'No hay clientes' : 'No clients yet.')}
            cta={!search ? (
              <Link href={`/${locale}/clients/new`} className="btn-primary btn-sm">
                <Plus size={14} /> {locale === 'es' ? 'Nuevo cliente' : 'New Client'}
              </Link>
            ) : undefined}
          />
        ) : view === 'table' ? (
          <div
            className={`${isPending ? 'opacity-50' : ''}`}
            style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', borderRadius: 10, overflow: 'hidden' }}
          >
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[700px]">
                <thead style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--wp-text-3)' }} onClick={() => toggleSort('name')}>
                      <span className="flex items-center gap-1">{locale === 'es' ? 'Cliente' : 'Client'} <ArrowUpDown size={11} /></span>
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Ubicación' : 'Location'}</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--wp-text-3)' }} onClick={() => toggleSort('jobs')}>
                      <span className="flex items-center justify-center gap-1">Jobs <ArrowUpDown size={11} /></span>
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer" style={{ color: 'var(--wp-text-3)' }} onClick={() => toggleSort('revenue')}>
                      <span className="flex items-center justify-end gap-1">{locale === 'es' ? 'Facturado' : 'Total billed'} <ArrowUpDown size={11} /></span>
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Status</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {alphabetGroups.map(([letter, clients]) => (
                    <>
                      <tr key={`group-${letter}`}>
                        <td colSpan={6} className="px-4 py-1.5" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-light)' }}>
                          <span className="text-xs font-bold" style={{ color: 'var(--wp-text-3)' }}>{letter}</span>
                        </td>
                      </tr>
                      {clients.map(client => {
                        const st = clientStats[client.id]
                        const isActive = (st?.jobCount ?? 0) > 0
                        return (
                          <tr
                            key={client.id}
                            onClick={() => router.push(`/${locale}/clients/${client.id}`)}
                            onMouseEnter={() => router.prefetch(`/${locale}/clients/${client.id}`)}
                            className="group cursor-pointer hover:bg-[var(--wp-surface-2)] transition-colors"
                            style={{ borderBottom: '1px solid var(--wp-border-light)' }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <ClientAvatar name={client.name} size="md" />
                                <div>
                                  <span style={{ color: 'var(--wp-text)', fontWeight: 600, fontSize: '0.8125rem' }}>{client.name}</span>
                                  {client.email && <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{client.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--wp-text-2)' }}>{client.address || '—'}</td>
                            <td className="px-4 py-3 text-center text-xs" style={{ color: 'var(--wp-text-2)' }}>{st?.jobCount ?? 0}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-sm" style={{ color: 'var(--wp-text)' }}>
                              {st?.revenue ? `$${formatCurrencyCompact(st.revenue)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: isActive ? 'var(--wp-success-bg-v2, #F0FDF4)' : 'var(--wp-surface-2)', color: isActive ? 'var(--wp-success-v2)' : 'var(--wp-text-3)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? 'var(--wp-success-v2)' : 'var(--wp-text-3)' }} />
                                {isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteId(client.id) }}
                                className="btn-ghost p-1.5 hover:!text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ minHeight: 'auto' }}
                                aria-label="Delete client"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ opacity: isPending ? 0.5 : 1 }}>
            {filtered.map(client => {
              const st = clientStats[client.id]
              return (
                <div
                  key={client.id}
                  className="group relative rounded-[10px] transition-all"
                  style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-1)' }}
                >
                  <Link href={`/${locale}/clients/${client.id}`} className="block p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <ClientAvatar name={client.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--wp-text)' }}>{client.name}</div>
                        {client.address && (
                          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--wp-text-3)' }}>{client.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                          <Mail size={12} style={{ color: 'var(--wp-text-3)' }} /> <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                          <Phone size={12} style={{ color: 'var(--wp-text-3)' }} /> {client.phone}
                        </div>
                      )}
                    </div>
                    {(st?.jobCount > 0 || st?.revenue > 0) && (
                      <div
                        className="flex items-center gap-3 pt-2"
                        style={{ borderTop: '1px solid var(--wp-border-light)' }}
                      >
                        {st?.jobCount > 0 && (
                          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--wp-text-2)' }}>
                            <Briefcase size={11} style={{ color: 'var(--wp-info-v2)' }} /> {st.jobCount} {st.jobCount !== 1 ? 'jobs' : 'job'}
                          </div>
                        )}
                        {st?.revenue > 0 && (
                          <div className="flex items-center gap-1 text-xs font-semibold tabular-nums ml-auto" style={{ color: 'var(--wp-success-v2)' }}>
                            ${formatCurrencyCompact(st.revenue)}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={() => setDeleteId(client.id)}
                    className="absolute top-3 right-3 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
                    style={{ color: 'var(--wp-text-3)' }}
                    aria-label="Delete client"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
