'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/lib/actions/clients'
import { Users, Plus, Trash2, Mail, Phone } from 'lucide-react'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }

export function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = initialClients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  function handleDelete(id: string) {
    if (!confirm('Delete this client?')) return
    startTransition(async () => {
      await deleteClient(id)
      router.refresh()
    })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <Link href={`/${locale}/clients/new`} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> New Client
        </Link>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="plumbr-input max-w-sm"
        />
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ opacity: isPending ? 0.5 : 1 }}>
          {filtered.map(client => (
            <div key={client.id} className="plumbr-card p-5 flex flex-col gap-3 relative group hover:shadow-md transition-shadow cursor-pointer">
              <Link href={`/${locale}/clients/${client.id}`} className="absolute inset-0 rounded-xl" aria-label={`View ${client.name}`} />
              <div className="flex items-start justify-between">
                <span className="font-semibold text-[#1E3A5F] text-base">{client.name}</span>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(client.id) }}
                  className="relative z-10 text-slate-400 hover:text-red-500 transition-colors ml-2 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
