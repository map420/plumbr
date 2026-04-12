'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updateInvoice } from '@/lib/actions/invoices'
import { generateInvoiceShareToken } from '@/lib/actions/portal'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Receipt, Plus, Share2, Check } from 'lucide-react'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
type Invoice = { id: string; number: string; clientName: string; status: string; dueDate: Date | null; total: string; paidAt: Date | null }
type T = { title: string; new: string; empty: string; markAsPaid: string; status: Record<InvoiceStatus, string>; fields: { number: string; clientName: string; dueDate: string; total: string } }

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
  return inv.status as InvoiceStatus
}

const FILTER_OPTIONS: Array<InvoiceStatus | 'all'> = ['all', 'draft', 'sent', 'overdue', 'paid', 'cancelled']

export function InvoicesClient({ initialInvoices, translations: t }: { initialInvoices: Invoice[]; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleShare(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const url = await generateInvoiceShareToken(id)
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => { await updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() }); router.refresh() })
  }

  const filteredInvoices = initialInvoices.filter(inv => {
    const matchesFilter = filter === 'all' || effectiveStatus(inv) === filter
    const matchesSearch = !search ||
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/invoices/new`} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> {t.new}</Link>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by client or invoice number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="plumbr-input max-w-xs"
        />
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_OPTIONS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${filter === f ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f === 'all' ? 'All' : t.status[f]}
          </button>
        ))}
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="plumbr-card p-12 text-center"><Receipt size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500">{filter === 'all' ? t.empty : `No ${filter} invoices.`}</p></div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className={`md:hidden space-y-2 ${isPending ? 'opacity-50' : ''}`}>
            {filteredInvoices.map((inv) => {
              const status = effectiveStatus(inv)
              return (
                <div key={inv.id} onClick={() => router.push(`/${locale}/invoices/${inv.id}`)} className="plumbr-card p-4 cursor-pointer active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{inv.number}</p>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{inv.clientName}</p>
                    </div>
                    <InvoiceStatusBadge status={status} label={t.status[status]} />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-slate-400">
                      {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : '—'}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">${parseFloat(inv.total).toLocaleString()}</span>
                      <button onClick={e => handleShare(e, inv.id)} className="text-slate-400 hover:text-[#1E3A5F] p-1" title="Copy client link">
                        {copiedId === inv.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                      </button>
                      {(status === 'sent' || status === 'overdue') && (
                        <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.id) }} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">
                          {t.markAsPaid}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className={`hidden md:block plumbr-card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.number}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.clientName}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.dueDate}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t.fields.total}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const status = effectiveStatus(inv)
                  return (
                    <tr key={inv.id} onClick={() => router.push(`/${locale}/invoices/${inv.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-4 py-3 font-medium text-slate-800">{inv.number}</td>
                      <td className="px-4 py-3 text-slate-600">{inv.clientName}</td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={status} label={t.status[status]} /></td>
                      <td className="px-4 py-3 text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">${parseFloat(inv.total).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={e => handleShare(e, inv.id)} className="text-slate-400 hover:text-[#1E3A5F] transition-colors" title="Copy client link">
                            {copiedId === inv.id ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
                          </button>
                          {(status === 'sent' || status === 'overdue') && (
                            <button onClick={e => { e.stopPropagation(); handleMarkPaid(inv.id) }} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">{t.markAsPaid}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
