'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateJob } from '@/lib/actions/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ArrowLeft, CheckSquare, Square, Camera, MapPin } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; address: string | null }
type T = { todaysJobs: string; checklist: string; photos: string; uploadPhoto: string; status: Record<JobStatus, string> }

const DEFAULT_TASKS = [
  'Review job scope with client',
  'Confirm materials on-site',
  'Take before photos',
  'Complete work',
  'Take after photos',
  'Client sign-off',
]

export function FieldJobClient({ job, locale, translations: t }: { job: Job; locale: string; translations: T }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const storageKey = `plumbr_checklist_${job.id}`
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') } catch { return {} }
  })

  function toggleTask(task: string) {
    const updated = { ...checklist, [task]: !checklist[task] }
    setChecklist(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  function markComplete() {
    startTransition(async () => { await updateJob(job.id, { status: 'completed' }); router.push(`/${locale}/field`) })
  }

  const completedCount = DEFAULT_TASKS.filter((task) => checklist[task]).length

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href={`/${locale}/field`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={14} /> {t.todaysJobs}
      </Link>

      <div className="plumbr-card p-4 mb-4">
        <h1 className="text-lg font-bold text-slate-900">{job.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{job.clientName}</p>
        {job.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-[#F97316] mt-2 hover:underline">
            <MapPin size={12} /> {job.address}
          </a>
        )}
        <div className="mt-2">
          <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
        </div>
      </div>

      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">{t.checklist}</h2>
          <span className="text-xs text-slate-400">{completedCount}/{DEFAULT_TASKS.length}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
          <div className="h-1.5 rounded-full bg-[#F97316] transition-all" style={{ width: `${(completedCount / DEFAULT_TASKS.length) * 100}%` }} />
        </div>
        <div className="space-y-2">
          {DEFAULT_TASKS.map((task) => (
            <button key={task} onClick={() => toggleTask(task)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left">
              {checklist[task]
                ? <CheckSquare size={18} className="text-green-500 shrink-0" />
                : <Square size={18} className="text-slate-300 shrink-0" />}
              <span className={`text-sm ${checklist[task] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="plumbr-card p-4 mb-4">
        <h2 className="font-semibold text-slate-800 mb-3">{t.photos}</h2>
        <button className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center gap-2 text-slate-400 hover:border-[#F97316]/50 hover:text-[#F97316] transition-colors">
          <Camera size={24} />
          <span className="text-sm">{t.uploadPhoto}</span>
        </button>
      </div>

      {job.status !== 'completed' && (
        <button onClick={markComplete} disabled={isPending} className="w-full btn-primary py-3 text-sm disabled:opacity-50">
          Mark Job as Completed ✓
        </button>
      )}
    </div>
  )
}
