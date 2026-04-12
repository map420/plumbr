'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateJob } from '@/lib/actions/jobs'
import { createExpense } from '@/lib/actions/expenses'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CheckSquare, Square, Camera, MapPin, ExternalLink, Clock, CheckCircle2 } from 'lucide-react'

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
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [hoursLogged, setHoursLogged] = useState(false)
  const [isLoggingHours, startLoggingHours] = useTransition()
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

  function logHours(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    const r = parseFloat(rate)
    if (!h || h <= 0) return
    const amount = r > 0 ? (h * r).toFixed(2) : '0.00'
    startLoggingHours(async () => {
      await createExpense(job.id, {
        description: `${h}h labor`,
        type: 'labor',
        amount,
        date: new Date().toISOString(),
        hours: String(h),
        ratePerHour: r > 0 ? String(r) : undefined,
      })
      setHours('')
      setRate('')
      setHoursLogged(true)
    })
  }

  const completedCount = DEFAULT_TASKS.filter((task) => checklist[task]).length

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Breadcrumbs items={[{ label: 'Field', href: `/${locale}/field` }, { label: job.name }]} />

      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{job.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{job.clientName}</p>
          </div>
          <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 text-xs text-[#1E3A5F] hover:underline shrink-0 mt-1">
            <ExternalLink size={12} /> Full details
          </Link>
        </div>
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

      {/* Log Hours */}
      <div className="plumbr-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-[#1E3A5F]" />
          <h2 className="font-semibold text-slate-800">Log Hours</h2>
        </div>
        {hoursLogged ? (
          <div className="flex items-center gap-2 text-green-600 text-sm py-2">
            <CheckCircle2 size={16} /> Hours logged as labor expense
          </div>
        ) : (
          <form onSubmit={logHours} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Hours worked</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 4"
                  className="plumbr-input text-sm w-full"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Rate/hr (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="e.g. 75"
                  className="plumbr-input text-sm w-full"
                />
              </div>
            </div>
            <button type="submit" disabled={isLoggingHours} className="btn-secondary text-sm disabled:opacity-50">
              {isLoggingHours ? 'Logging...' : 'Log as Labor Expense'}
            </button>
          </form>
        )}
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
