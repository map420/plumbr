'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { MapPin, ChevronRight, Smartphone } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; address: string | null; startDate: Date | null }
type T = {
  title: string; todaysJobs: string; noJobs: string
  status: Record<JobStatus, string>
  fields: { address: string; clientName: string }
}

function isToday(date: Date) {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

export function FieldClient({ initialJobs, translations: t }: { initialJobs: Job[]; translations: T }) {
  const locale = useLocale()
  const active = initialJobs.filter((j) => j.status === 'active')
  const todayJobs = active.filter((j) => j.startDate && isToday(new Date(j.startDate)))
  const upcomingJobs = active.filter((j) => !j.startDate || !isToday(new Date(j.startDate))).slice(0, 5)

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Smartphone size={20} className="text-[#F97316]" />
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t.todaysJobs}</h2>
        {todayJobs.length === 0 ? (
          <div className="plumbr-card p-6 text-center text-slate-400 text-sm">{t.noJobs}</div>
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <Link key={job.id} href={`/${locale}/field/${job.id}`} className="plumbr-card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{job.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{job.clientName}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                      <MapPin size={11} /> {job.address}
                    </div>
                  )}
                  <div className="mt-2">
                    <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 ml-3 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Active Jobs</h2>
          <div className="space-y-2">
            {upcomingJobs.map((job) => (
              <Link key={job.id} href={`/${locale}/field/${job.id}`} className="plumbr-card p-3 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div>
                  <p className="text-sm font-medium text-slate-800">{job.name}</p>
                  <p className="text-xs text-slate-400">{job.clientName}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
