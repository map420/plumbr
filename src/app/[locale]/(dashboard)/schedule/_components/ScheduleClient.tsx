'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getJobs, Job, JobStatus } from '@/lib/store/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type T = { title: string; today: string; noJobs: string; status: Record<JobStatus, string> }

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ScheduleClient({ translations: t }: { translations: T }) {
  const locale = useLocale()
  const [jobs, setJobs] = useState<Job[]>([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  useEffect(() => { setJobs(getJobs()) }, [])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  function jobsForDay(day: Date) {
    return jobs.filter((j) => {
      if (!j.startDate) return false
      return sameDay(new Date(j.startDate), day)
    })
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">
            {t.today}
          </button>
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {days.map((day, i) => {
          const dayJobs = jobsForDay(day)
          const isToday = sameDay(day, new Date())
          return (
            <div key={i} className={`plumbr-card p-3 min-h-[200px] ${isToday ? 'ring-2 ring-[#F97316]' : ''}`}>
              <div className={`text-xs font-semibold mb-2 ${isToday ? 'text-[#F97316]' : 'text-slate-500'}`}>
                {DAY_NAMES[day.getDay()]} {day.getDate()}
              </div>
              {dayJobs.length === 0 ? (
                <p className="text-xs text-slate-300">{t.noJobs}</p>
              ) : (
                <div className="space-y-1.5">
                  {dayJobs.map((job) => (
                    <Link key={job.id} href={`/${locale}/jobs/${job.id}`} className="block p-2 rounded-lg bg-[#1E3A5F]/5 hover:bg-[#1E3A5F]/10 transition-colors">
                      <p className="text-xs font-medium text-[#1E3A5F] truncate">{job.name}</p>
                      <p className="text-xs text-slate-400 truncate">{job.clientName}</p>
                      <div className="mt-1">
                        <JobStatusBadge status={job.status} label={t.status[job.status]} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
