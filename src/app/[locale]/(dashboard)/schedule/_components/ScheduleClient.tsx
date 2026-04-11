'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; startDate: Date | null; endDate: Date | null }
type T = { title: string; today: string; noJobs: string; status: Record<JobStatus, string> }

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ScheduleClient({ initialJobs, translations: t }: { initialJobs: Job[]; translations: T }) {
  const locale = useLocale()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  function jobsForDay(day: Date) {
    return initialJobs.filter((j) => {
      if (!j.startDate) return false
      const start = new Date(j.startDate)
      start.setHours(0, 0, 0, 0)
      if (j.endDate) {
        const end = new Date(j.endDate)
        end.setHours(23, 59, 59, 999)
        return day >= start && day <= end
      }
      return sameDay(start, day)
    })
  }

  return (
    <div className="p-4 md:p-8">
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
                        <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
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
