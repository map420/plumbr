'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteEstimate } from '@/lib/actions/estimates'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { FileText, Plus, Trash2 } from 'lucide-react'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type Estimate = { id: string; number: string; clientName: string; status: string; total: string; createdAt: Date }
type T = { title: string; new: string; empty: string; status: Record<EstimateStatus, string>; fields: { number: string; clientName: string; total: string } }

export function EstimatesClient({ initialEstimates, translations: t }: { initialEstimates: Estimate[]; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm('Delete this estimate?')) return
    startTransition(async () => { await deleteEstimate(id); router.refresh() })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/estimates/new`} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> {t.new}</Link>
      </div>

      {initialEstimates.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t.empty}</p>
          <Link href={`/${locale}/estimates/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4"><Plus size={16} /> {t.new}</Link>
        </div>
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
              {initialEstimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3"><Link href={`/${locale}/estimates/${est.id}`} className="font-medium text-[#1E3A5F] hover:underline">{est.number}</Link></td>
                  <td className="px-4 py-3 text-slate-600">{est.clientName}</td>
                  <td className="px-4 py-3"><EstimateStatusBadge status={est.status as EstimateStatus} label={t.status[est.status as EstimateStatus]} /></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(est.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">${parseFloat(est.total).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(est.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button></td>
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
