'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteEstimate } from '@/lib/actions/estimates'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { FileText, Plus, Trash2 } from 'lucide-react'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type Estimate = { id: string; number: string; clientName: string; status: string; total: string; createdAt: Date }
type T = { title: string; new: string; empty: string; status: Record<EstimateStatus, string>; fields: { number: string; clientName: string; total: string } }

const ALL_STATUSES: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

export function EstimatesClient({ initialEstimates, planInfo, translations: t }: { initialEstimates: Estimate[]; planInfo: { current: number; limit: number } | null; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<EstimateStatus | 'all'>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const visible = initialEstimates.filter(e => {
    const matchesSearch = e.clientName.toLowerCase().includes(search.toLowerCase()) || e.number.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || e.status === filter
    return matchesSearch && matchesFilter
  })

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteEstimate(deleteId); router.refresh() })
    setDeleteId(null)
  }

  return (
    <div className="p-4 md:p-8">
      {deleteId && (
        <ConfirmModal
          title="Delete Estimate"
          message="Are you sure you want to delete this estimate? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {planInfo && <PlanLimitBanner current={planInfo.current} limit={planInfo.limit} resource="estimates" />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/estimates/new`} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> {t.new}</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by client or number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="plumbr-input max-w-xs"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === 'all' ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</button>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === s ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.status[s]}
            </button>
          ))}
        </div>
      </div>

      {initialEstimates.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t.empty}</p>
          <Link href={`/${locale}/estimates/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4"><Plus size={16} /> {t.new}</Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="plumbr-card p-8 text-center text-slate-400 text-sm">No estimates match your search.</div>
      ) : (
        <div className={`plumbr-card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.number}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.clientName}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t.fields.total}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((est) => (
                <tr key={est.id} onClick={() => router.push(`/${locale}/estimates/${est.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-800">{est.number}</td>
                  <td className="px-4 py-3 text-slate-600">{est.clientName}</td>
                  <td className="px-4 py-3"><EstimateStatusBadge status={est.status as EstimateStatus} label={t.status[est.status as EstimateStatus]} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(est.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">${parseFloat(est.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><button onClick={e => { e.stopPropagation(); setDeleteId(est.id) }} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
