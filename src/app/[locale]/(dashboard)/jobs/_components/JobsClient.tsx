'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteJob } from '@/lib/actions/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Briefcase, Plus, Trash2 } from 'lucide-react'

type Job = { id: string; name: string; clientName: string; status: string; startDate: Date | null; budgetedCost: string | null }
type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Translations = {
  title: string; new: string; empty: string
  status: Record<JobStatus, string>
  fields: { name: string; clientName: string; startDate: string; budgetedCost: string }
}

const ALL_STATUSES: JobStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

export function JobsClient({ initialJobs, planInfo, translations: t }: { initialJobs: Job[]; planInfo: { current: number; limit: number } | null; translations: Translations }) {
  const locale = useLocale()
  const router = useRouter()
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = filter === 'all' ? initialJobs : initialJobs.filter((j) => j.status === filter)

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteJob(deleteId); router.refresh() })
    setDeleteId(null)
  }

  return (
    <div className="p-4 md:p-8">
      {deleteId && (
        <ConfirmModal
          title="Delete Job"
          message="Are you sure you want to delete this job? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {planInfo && <PlanLimitBanner current={planInfo.current} limit={planInfo.limit} resource="jobs" />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/jobs/new`} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t.new}
        </Link>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[#1E3A5F] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-[#1E3A5F] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            {t.status[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t.empty}</p>
          <Link href={`/${locale}/jobs/new`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
            <Plus size={16} /> {t.new}
          </Link>
        </div>
      ) : (
        <div className="plumbr-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.name}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.clientName}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.startDate}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t.fields.budgetedCost}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 ${isPending ? 'opacity-50' : ''}`}>
              {filtered.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/jobs/${job.id}`} className="font-medium text-[#1E3A5F] hover:underline">{job.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.clientName}</td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {job.budgetedCost && parseFloat(job.budgetedCost) > 0 ? `$${parseFloat(job.budgetedCost).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteId(job.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
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
