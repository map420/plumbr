'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { formatCurrencyCompact } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/lib/actions/clients'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Users, Plus, Trash2, Mail, Phone, Briefcase, DollarSign, LayoutGrid, List, ArrowUpDown, Circle } from 'lucide-react'
import { SwipeableRow } from '@/components/SwipeableRow'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }
type ClientStats = { jobCount: number; revenue: number }
type SortKey = 'name' | 'jobs' | 'revenue'
type View = 'grid' | 'table'

export function ClientsClient({ initialClients, clientStats = {} }: { initialClients: Client[]; clientStats?: Record<string, ClientStats> }) {
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('grid')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = initialClients
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
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
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>Clients</h1>
        <Link href={`/${locale}/clients/new`} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> New Client
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none md:max-w-sm"
          style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-primary)' }}
        />
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="input text-sm py-1.5 pr-8 max-w-[140px]">
            <option value="name">Sort: Name</option>
            <option value="jobs">Sort: Jobs</option>
            <option value="revenue">Sort: Revenue</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="p-2 rounded-lg hover:opacity-80" style={{ border: '1px solid var(--wp-border)', color: 'var(--wp-text-muted)' }} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
            <ArrowUpDown size={14} className={`${sortDir === 'desc' ? 'rotate-180' : ''} transition-transform`} />
          </button>
          <div className="flex rounded-lg overflow-hidden ml-1" style={{ border: '1px solid var(--wp-border)' }}>
            <button onClick={() => setView('grid')} className="p-2" style={{ background: view === 'grid' ? 'var(--wp-primary)' : 'transparent', color: view === 'grid' ? 'white' : 'var(--wp-text-muted)' }}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')} className="p-2" style={{ background: view === 'table' ? 'var(--wp-primary)' : 'transparent', color: view === 'table' ? 'white' : 'var(--wp-text-muted)' }}><List size={14} /></button>
          </div>
        </div>
      </div>

      {/* Mobile ABC list — Joist style */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12"><Users size={32} className="mx-auto mb-2" style={{ color: 'var(--wp-border)' }} /><p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>No clients yet.</p></div>
        ) : (() => {
          // Group with active projects first, then alphabetical
          const withActive = filtered.filter(c => (clientStats[c.id]?.jobCount ?? 0) > 0)
          const withoutActive = filtered.filter(c => (clientStats[c.id]?.jobCount ?? 0) === 0)
          const sorted = [...withoutActive].sort((a, b) => a.name.localeCompare(b.name))

          // Group by first letter
          const abcGroups = sorted.reduce<Record<string, Client[]>>((acc, c) => {
            const letter = c.name.charAt(0).toUpperCase()
            if (!acc[letter]) acc[letter] = []
            acc[letter].push(c)
            return acc
          }, {})
          const letters = Object.keys(abcGroups).sort()

          return (
            <div className="relative">
              {/* Active clients section */}
              {withActive.length > 0 && (
                <>
                  <div className="py-2 px-1 -mx-4 px-4" style={{ background: 'var(--wp-bg-muted)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>Active Projects</span>
                  </div>
                  {withActive.map((c, idx) => (
                    <SwipeableRow key={c.id} actions={[
                      { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error)', onClick: () => setDeleteId(c.id) },
                    ]}>
                      <Link href={`/${locale}/clients/${c.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                        <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>{c.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={12} style={{ color: 'var(--wp-accent)' }} />
                          <span className="text-[10px] font-medium" style={{ color: 'var(--wp-accent)' }}>{clientStats[c.id]?.jobCount}</span>
                        </div>
                      </Link>
                    </SwipeableRow>
                  ))}
                </>
              )}

              {/* ABC grouped list */}
              {letters.map(letter => (
                <div key={letter}>
                  <div className="py-2 px-1 -mx-4 px-4 mt-1" style={{ background: 'var(--wp-bg-muted)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--wp-text-muted)' }}>{letter}</span>
                  </div>
                  {abcGroups[letter].map((c, idx) => (
                    <SwipeableRow key={c.id} actions={[
                      { label: 'Delete', icon: <Trash2 size={16} />, color: 'white', bg: 'var(--wp-error)', onClick: () => setDeleteId(c.id) },
                    ]}>
                      <Link href={`/${locale}/clients/${c.id}`} className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--wp-border-light)', animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}>
                        <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>{c.name}</span>
                        {(clientStats[c.id]?.jobCount ?? 0) > 0 && (
                          <Briefcase size={12} style={{ color: 'var(--wp-accent)' }} />
                        )}
                      </Link>
                    </SwipeableRow>
                  ))}
                </div>
              ))}

              {/* Alphabet index on the right */}
              <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center text-[8px] font-medium leading-tight" style={{ color: 'var(--wp-text-muted)' }}>
                {letters.map(l => (
                  <span key={l}>{l}</span>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Desktop views */}
      <div className="hidden md:block">
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--wp-border)' }} />
          <p style={{ color: 'var(--wp-text-muted)' }}>{search ? 'No clients match your search.' : 'No clients yet.'}</p>
          {!search && (
            <Link href={`/${locale}/clients/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
              <Plus size={16} /> New Client
            </Link>
          )}
        </div>
      ) : view === 'table' ? (
        <div className={`card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium cursor-pointer" style={{ color: 'var(--wp-text-muted)' }} onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">Name <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>Email</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>Phone</th>
                  <th className="text-center px-4 py-3 font-medium cursor-pointer" style={{ color: 'var(--wp-text-muted)' }} onClick={() => toggleSort('jobs')}>
                    <span className="flex items-center justify-center gap-1">Jobs <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium cursor-pointer" style={{ color: 'var(--wp-text-muted)' }} onClick={() => toggleSort('revenue')}>
                    <span className="flex items-center justify-end gap-1">Revenue <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid var(--wp-border-light)' }}>
                {filtered.map(client => (
                  <tr key={client.id} onClick={() => router.push(`/${locale}/clients/${client.id}`)}
                    onMouseEnter={() => router.prefetch(`/${locale}/clients/${client.id}`)}
                    className="transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--wp-text-primary)' }}>{client.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>{client.email || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--wp-text-secondary)' }}>{clientStats[client.id]?.jobCount ?? 0}</td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--wp-text-secondary)' }}>
                      {clientStats[client.id]?.revenue ? `$${formatCurrencyCompact(clientStats[client.id].revenue)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); setDeleteId(client.id) }} className="hover:text-red-500 transition-colors" style={{ color: 'var(--wp-text-muted)' }} aria-label="Delete client"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ opacity: isPending ? 0.5 : 1 }}>
          {filtered.map(client => (
            <div key={client.id} className="card group hover:shadow-md transition-all relative">
              <Link href={`/${locale}/clients/${client.id}`} className="block p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-base" style={{ color: 'var(--wp-primary)' }}>{client.name}</span>
                  <span className="w-6 shrink-0" />
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--wp-text-muted)' }}>
                    <Mail size={13} /> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--wp-text-muted)' }}>
                    <Phone size={13} /> {client.phone}
                  </div>
                )}
                {client.address && (
                  <p className="text-xs truncate" style={{ color: 'var(--wp-text-muted)' }}>{client.address}</p>
                )}
                {(clientStats[client.id]?.jobCount > 0 || clientStats[client.id]?.revenue > 0) && (
                  <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
                    {clientStats[client.id]?.jobCount > 0 && (
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-muted)' }}>
                        <Briefcase size={11} /> {clientStats[client.id].jobCount} job{clientStats[client.id].jobCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {clientStats[client.id]?.revenue > 0 && (
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--wp-success)' }}>
                        <DollarSign size={11} /> ${formatCurrencyCompact(clientStats[client.id].revenue)}
                      </div>
                    )}
                  </div>
                )}
              </Link>
              <button
                onClick={() => setDeleteId(client.id)}
                className="absolute top-4 right-4 z-10 hover:text-red-500 transition-colors"
                style={{ color: 'var(--wp-text-muted)' }}
                aria-label="Delete client"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
