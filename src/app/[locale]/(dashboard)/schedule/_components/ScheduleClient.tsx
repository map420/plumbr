'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, LayoutGrid } from 'lucide-react'

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

function jobsForDay(jobs: Job[], day: Date) {
  return jobs.filter((j) => {
    if (!j.startDate) return false
    const start = new Date(j.startDate); start.setHours(0, 0, 0, 0)
    if (j.endDate) {
      const end = new Date(j.endDate); end.setHours(23, 59, 59, 999)
      return day >= start && day <= end
    }
    return sameDay(start, day)
  })
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function ScheduleClient({ initialJobs, translations: t }: { initialJobs: Job[]; translations: T }) {
  const locale = useLocale()
  const [view, setView] = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d })

  // --- Week view ---
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  // --- Month view ---
  function getMonthGrid(base: Date) {
    const year = base.getFullYear()
    const month = base.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const cells: (Date | null)[] = Array(startPad).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const monthGrid = getMonthGrid(monthDate)

  function prevMonth() {
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const headerLabel = view === 'week'
    ? `${weekDays[0].toLocaleString('en', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden mr-1">
            <button onClick={() => setView('week')} title="Week view" className={`p-2 ${view === 'week' ? 'bg-[#1E3A5F] text-white' : 'hover:bg-slate-50 text-slate-500'}`}>
              <CalendarDays size={15} />
            </button>
            <button onClick={() => setView('month')} title="Month view" className={`p-2 ${view === 'month' ? 'bg-[#1E3A5F] text-white' : 'hover:bg-slate-50 text-slate-500'}`}>
              <LayoutGrid size={15} />
            </button>
          </div>

          {/* Nav */}
          <button onClick={() => view === 'week' ? setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) : prevMonth()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{headerLabel}</span>
          <button onClick={() => view === 'week' ? setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) : nextMonth()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => { setWeekStart(startOfWeek(new Date())); setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium">
            {t.today}
          </button>
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => {
            const dayJobs = jobsForDay(initialJobs, day)
            const isToday = sameDay(day, new Date())
            return (
              <div key={i} className={`plumbr-card p-3 min-h-[200px] group/day ${isToday ? 'ring-2 ring-[#F97316]' : ''}`}>
                <div className={`flex items-center justify-between mb-2 ${isToday ? 'text-[#F97316]' : 'text-slate-500'}`}>
                  <span className="text-xs font-semibold">{DAY_NAMES[day.getDay()]} {day.getDate()}</span>
                  <Link href={`/${locale}/jobs/new`} className="opacity-0 group-hover/day:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100" title="Add job">
                    <Plus size={12} className="text-slate-400 hover:text-[#F97316]" />
                  </Link>
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
      )}

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[80px]" />
              const dayJobs = jobsForDay(initialJobs, day)
              const isToday = sameDay(day, new Date())
              return (
                <div key={i} className={`plumbr-card p-2 min-h-[80px] group/day ${isToday ? 'ring-2 ring-[#F97316]' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${isToday ? 'text-[#F97316]' : 'text-slate-500'}`}>{day.getDate()}</span>
                    <Link href={`/${locale}/jobs/new`} className="opacity-0 group-hover/day:opacity-100 transition-opacity" title="Add job">
                      <Plus size={10} className="text-slate-400 hover:text-[#F97316]" />
                    </Link>
                  </div>
                  <div className="space-y-0.5">
                    {dayJobs.slice(0, 2).map(job => (
                      <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                        className="block text-[10px] font-medium text-white bg-[#1E3A5F] rounded px-1 py-0.5 truncate hover:bg-[#16304f]">
                        {job.name}
                      </Link>
                    ))}
                    {dayJobs.length > 2 && (
                      <p className="text-[10px] text-slate-400">+{dayJobs.length - 2} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
