'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getJobs, Job, JobStatus } from '@/lib/store/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { MapPin, ChevronRight, Smartphone } from 'lucide-react'

type T = {
  title: string; todaysJobs: string; noJobs: string
  status: Record<JobStatus, string>
  fields: { address: string; clientName: string }
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

export function FieldClient({ translations: t }: { translations: T }) {
  const locale = useLocale()
  const [todayJobs, setTodayJobs] = useState<Job[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])

  useEffect(() => {
    const all = getJobs().filter((j) => j.status === 'active')
    setTodayJobs(all.filter((j) => j.startDate && isToday(j.startDate)))
    setUpcomingJobs(all.filter((j) => !j.startDate || !isToday(j.startDate)).slice(0, 5))
  }, [])

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Smartphone size={20} className="text-[#F97316]" />
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
      </div>

      {/* Today */}
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
                    <JobStatusBadge status={job.status} label={t.status[job.status]} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 ml-3 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming active jobs */}
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
