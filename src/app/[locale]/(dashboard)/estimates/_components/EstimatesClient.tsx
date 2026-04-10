'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getEstimates, deleteEstimate, Estimate, EstimateStatus } from '@/lib/store/estimates'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { FileText, Plus, Trash2 } from 'lucide-react'

type Translations = {
  title: string; new: string; empty: string
  status: Record<EstimateStatus, string>
  fields: { number: string; clientName: string; total: string }
}

export function EstimatesClient({ translations: t }: { translations: Translations }) {
  const locale = useLocale()
  const [estimates, setEstimates] = useState<Estimate[]>([])

  useEffect(() => { setEstimates(getEstimates()) }, [])

  function handleDelete(id: string) {
    if (!confirm('Delete this estimate?')) return
    deleteEstimate(id)
    setEstimates(getEstimates())
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/estimates/new`} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t.new}
        </Link>
      </div>

      {estimates.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t.empty}</p>
          <Link href={`/${locale}/estimates/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
            <Plus size={16} /> {t.new}
          </Link>
        </div>
      ) : (
        <div className="plumbr-card overflow-hidden">
          <table className="w-full text-sm">
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
              {estimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/estimates/${est.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {est.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{est.clientName}</td>
                  <td className="px-4 py-3">
                    <EstimateStatusBadge status={est.status} label={t.status[est.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(est.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${est.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(est.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
