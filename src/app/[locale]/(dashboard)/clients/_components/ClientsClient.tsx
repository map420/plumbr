'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/lib/actions/clients'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Users, Plus, Trash2, Mail, Phone, Briefcase, DollarSign, LayoutGrid, List, ArrowUpDown } from 'lucide-react'

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
    <div className="p-4 md:p-8">
      {deleteId && (
        <ConfirmModal
          title="Delete Client"
          message="Are you sure you want to delete this client? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
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
          className="plumbr-input max-w-sm"
        />
        <div className="flex items-center gap-1 ml-auto">
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="plumbr-input text-sm py-1.5 pr-8 max-w-[140px]">
            <option value="name">Sort: Name</option>
            <option value="jobs">Sort: Jobs</option>
            <option value="revenue">Sort: Revenue</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50" title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
            <ArrowUpDown size={14} className={`text-slate-500 ${sortDir === 'desc' ? 'rotate-180' : ''} transition-transform`} />
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-1">
            <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#1E3A5F] text-white' : 'hover:bg-slate-50 text-slate-500'}`}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')} className={`p-2 ${view === 'table' ? 'bg-[#1E3A5F] text-white' : 'hover:bg-slate-50 text-slate-500'}`}><List size={14} /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{search ? 'No clients match your search.' : 'No clients yet.'}</p>
          {!search && (
            <Link href={`/${locale}/clients/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
              <Plus size={16} /> New Client
            </Link>
          )}
        </div>
      ) : view === 'table' ? (
        <div className={`plumbr-card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">Name <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Phone</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('jobs')}>
                    <span className="flex items-center justify-center gap-1">Jobs <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort('revenue')}>
                    <span className="flex items-center justify-end gap-1">Revenue <ArrowUpDown size={11} /></span>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(client => (
                  <tr key={client.id} onClick={() => router.push(`/${locale}/clients/${client.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-800">{client.name}</td>
                    <td className="px-4 py-3 text-slate-500">{client.email || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{client.phone || '—'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{clientStats[client.id]?.jobCount ?? 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {clientStats[client.id]?.revenue ? `$${clientStats[client.id].revenue.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); setDeleteId(client.id) }} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
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
            <div key={client.id} className="plumbr-card group hover:shadow-md transition-shadow relative">
              <Link href={`/${locale}/clients/${client.id}`} className="block p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-[#1E3A5F] text-base">{client.name}</span>
                  <span className="w-6 shrink-0" />
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={13} /> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone size={13} /> {client.phone}
                  </div>
                )}
                {client.address && (
                  <p className="text-xs text-slate-400 truncate">{client.address}</p>
                )}
                {(clientStats[client.id]?.jobCount > 0 || clientStats[client.id]?.revenue > 0) && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                    {clientStats[client.id]?.jobCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Briefcase size={11} /> {clientStats[client.id].jobCount} job{clientStats[client.id].jobCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {clientStats[client.id]?.revenue > 0 && (
                      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <DollarSign size={11} /> ${clientStats[client.id].revenue.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </Link>
              <button
                onClick={() => setDeleteId(client.id)}
                className="absolute top-4 right-4 z-10 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
