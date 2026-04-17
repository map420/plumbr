'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, LayoutGrid, GripVertical } from 'lucide-react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { updateJob } from '@/lib/actions/jobs'

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

type TechAssignment = { jobId: string; technicianId: string; technicianName: string }

// Draggable job card
function DraggableJob({ job, locale, t, techName }: { job: Job; locale: string; t: T; techName?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } })
  return (
    <div
      ref={setNodeRef}
      className={`block p-2 rounded-lg transition-colors ${isDragging ? 'opacity-30' : ''}`}
      style={{ background: 'color-mix(in srgb, var(--wp-primary) 8%, transparent)' }}
    >
      <div className="flex items-center gap-1">
        <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing shrink-0 touch-none" style={{ color: 'var(--wp-border)' }}>
          <GripVertical size={12} />
        </button>
        <Link href={`/${locale}/jobs/${job.id}`} className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate" style={{ color: 'var(--wp-primary)' }} title={job.name}>{job.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--wp-text-muted)' }} title={job.clientName}>{job.clientName}</p>
        </Link>
      </div>
      <div className="mt-1 ml-4 flex items-center gap-1.5">
        <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
        {techName && <span className="text-[9px] text-purple-600 bg-purple-50 px-1 py-0.5 rounded truncate max-w-[80px]">{techName}</span>}
      </div>
    </div>
  )
}

// Droppable day cell
function DroppableDay({ day, children, isToday }: { day: Date; children: React.ReactNode; isToday: boolean }) {
  const dateStr = day.toISOString().split('T')[0]
  const { isOver, setNodeRef } = useDroppable({ id: `day-${dateStr}`, data: { date: day } })
  return (
    <div
      ref={setNodeRef}
      className={`card p-3 min-h-[200px] group/day transition-colors ${isOver ? 'bg-blue-50 ring-2' : ''}`}
      style={isToday ? { boxShadow: '0 0 0 2px var(--wp-accent)' } : undefined}
    >
      {children}
    </div>
  )
}

export function ScheduleClient({ initialJobs, techAssignments = [], translations: t }: { initialJobs: Job[]; techAssignments?: TechAssignment[]; translations: T }) {
  const locale = useLocale()
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [techFilter, setTechFilter] = useState<Set<string>>(new Set())

  // Unique technicians from assignments
  const techs = (() => {
    const map = new Map<string, string>()
    techAssignments.forEach(a => map.set(a.technicianId, a.technicianName))
    return Array.from(map, ([id, name]) => ({ id, name }))
  })()

  const TECH_COLORS = ['#1D4ED8', '#15803D', '#B45309', '#7C3AED', '#0F766E', '#BE123C']

  // Filter jobs by selected technicians
  const filteredJobs = techFilter.size === 0 ? jobs : jobs.filter(j => {
    const assignment = techAssignments.find(a => a.jobId === j.id)
    return assignment && techFilter.has(assignment.technicianId)
  })

  // Today's jobs for sidebar
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayJobs = jobsForDay(jobs, today)

  // Mini calendar data
  const miniCalMonth = view === 'week' ? new Date(weekStart.getFullYear(), weekStart.getMonth(), 1) : monthDate
  const miniCalGrid = getMonthGrid(miniCalMonth)
  const miniCalDaysWithJobs = new Set(
    jobs.filter(j => j.startDate).map(j => {
      const d = new Date(j.startDate!)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as Job
    setActiveJob(job || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const targetDate = over.data.current?.date as Date
    if (!targetDate) return

    const job = jobs.find(j => j.id === jobId)
    if (!job || !job.startDate) return

    const oldStart = new Date(job.startDate)
    if (sameDay(oldStart, targetDate)) return // dropped on same day

    // Conflict detection: check if assigned technician has another job on target day
    const jobTechAssignment = techAssignments.find(a => a.jobId === jobId)
    if (jobTechAssignment) {
      const techOtherJobs = techAssignments
        .filter(a => a.technicianId === jobTechAssignment.technicianId && a.jobId !== jobId)
        .map(a => jobs.find(j => j.id === a.jobId))
        .filter(Boolean) as Job[]
      const targetDayStr = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`
      const conflicts = techOtherJobs.filter(j => {
        if (!j.startDate) return false
        const jd = new Date(j.startDate)
        return `${jd.getFullYear()}-${jd.getMonth()}-${jd.getDate()}` === targetDayStr
      })
      if (conflicts.length > 0) {
        const proceed = confirm(`⚠️ Schedule conflict: ${jobTechAssignment.technicianName} is already assigned to "${conflicts[0].name}" on ${targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.\n\nMove anyway?`)
        if (!proceed) return
      }
    }

    // Optimistic update
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j
      const newStart = new Date(targetDate)
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes())
      let newEnd = j.endDate ? new Date(j.endDate) : null
      if (newEnd) {
        const diff = newStart.getTime() - oldStart.getTime()
        newEnd = new Date(newEnd.getTime() + diff)
      }
      return { ...j, startDate: newStart, endDate: newEnd }
    }))

    // Persist to DB
    const newStart = new Date(targetDate)
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes())
    await updateJob(jobId, { startDate: newStart.toISOString() }).catch(() => {
      // Revert on error
      setJobs(initialJobs)
    })
    router.refresh()
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

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

  const headerLabel = view === 'week'
    ? `${weekDays[0].toLocaleString('en', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  const mobileDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i - 1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  return (
    <div className="px-4 pt-2 pb-4 md:p-8">
      <div className="hidden md:flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{t.title}</h1>
          <p className="text-xs mt-0.5 hidden md:block" style={{ color: 'var(--wp-text-muted)' }}>Drag jobs between days to reschedule</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden mr-1" style={{ border: '1px solid var(--wp-border)' }}>
            <button onClick={() => setView('week')} title="Week view" className="p-2" style={{ background: view === 'week' ? 'var(--wp-primary)' : 'transparent', color: view === 'week' ? 'white' : 'var(--wp-text-muted)' }}>
              <CalendarDays size={15} />
            </button>
            <button onClick={() => setView('month')} title="Month view" className="p-2" style={{ background: view === 'month' ? 'var(--wp-primary)' : 'transparent', color: view === 'month' ? 'white' : 'var(--wp-text-muted)' }}>
              <LayoutGrid size={15} />
            </button>
          </div>
          <button onClick={() => view === 'week' ? setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-2 rounded-lg" style={{ border: '1px solid var(--wp-border)' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center" style={{ color: 'var(--wp-text-secondary)' }}>{headerLabel}</span>
          <button onClick={() => view === 'week' ? setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) : setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-2 rounded-lg" style={{ border: '1px solid var(--wp-border)' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => { setWeekStart(startOfWeek(new Date())); setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) }}
            className="text-sm px-3 py-1.5 rounded-lg font-medium" style={{ border: '1px solid var(--wp-border)' }}>
            {t.today}
          </button>
        </div>
      </div>

      {/* Mobile list view (no DnD) */}
      <div className="md:hidden space-y-4">
        {mobileDays.map((day, i) => {
          const dayJobs = jobsForDay(jobs, day)
          const isToday = sameDay(day, new Date())
          if (dayJobs.length === 0 && !isToday) return null
          return (
            <div key={i}>
              <div className="py-2 px-3 -mx-4 rounded-none" style={{ background: 'var(--wp-bg-muted)' }}>
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: isToday ? 'var(--wp-accent)' : 'var(--wp-text-tertiary)' }}
                >
                  {isToday ? 'Today' : day.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {dayJobs.length === 0 ? (
                <p className="text-xs pl-1 mt-2" style={{ color: 'var(--wp-text-tertiary)' }}>{t.noJobs}</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {dayJobs.map((job, idx) => (
                    <Link
                      key={job.id}
                      href={`/${locale}/jobs/${job.id}`}
                      className="card p-3 flex items-center justify-between transition-colors"
                      style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--wp-text-primary)' }} title={job.name}>{job.name}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--wp-text-tertiary)' }} title={job.clientName}>{job.clientName}</p>
                      </div>
                      <div className="shrink-0 ml-3">
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

      {/* Desktop: 2-column layout with sidebar */}
      <div className="hidden md:grid grid-cols-[260px_1fr] gap-5 items-start">
        {/* ── LEFT SIDEBAR ── */}
        <div className="space-y-4 sticky top-4">
          {/* Mini calendar */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: 'var(--wp-text)' }}>
                {MONTH_NAMES[miniCalMonth.getMonth()]} {miniCalMonth.getFullYear()}
              </span>
              <div className="flex gap-1">
                <button onClick={() => {
                  const prev = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, 1)
                  if (view === 'month') setMonthDate(prev)
                  else setWeekStart(startOfWeek(prev))
                }} className="p-0.5" style={{ color: 'var(--wp-text-3)' }}><ChevronLeft size={14} /></button>
                <button onClick={() => {
                  const next = new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, 1)
                  if (view === 'month') setMonthDate(next)
                  else setWeekStart(startOfWeek(next))
                }} className="p-0.5" style={{ color: 'var(--wp-text-3)' }}><ChevronRight size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[9px] font-semibold py-1" style={{ color: 'var(--wp-text-3)' }}>{d}</div>
              ))}
              {miniCalGrid.map((day, i) => {
                if (!day) return <div key={i} className="h-7" />
                const isToday = sameDay(day, new Date())
                const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
                const hasJobs = miniCalDaysWithJobs.has(dayKey)
                return (
                  <button key={i} onClick={() => {
                    setWeekStart(startOfWeek(day))
                    setView('week')
                  }} className="h-7 flex flex-col items-center justify-center rounded-md text-[11px] transition-colors hover:bg-[var(--wp-surface-2)]"
                    style={isToday ? { background: 'var(--wp-brand)', color: 'white', fontWeight: 700 } : { color: 'var(--wp-text-2)' }}>
                    {day.getDate()}
                    {hasJobs && !isToday && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: 'var(--wp-brand)' }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Today's schedule */}
          <div className="card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold" style={{ color: 'var(--wp-text)' }}>
                {locale === 'es' ? 'Hoy' : 'Today'} · {todayJobs.length} jobs
              </span>
            </div>
            {todayJobs.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{t.noJobs}</p>
            ) : (
              <div className="space-y-1.5">
                {todayJobs.map((job, i) => (
                  <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-md transition-colors hover:bg-[var(--wp-surface-2)]"
                    style={{ borderLeft: `2px solid ${TECH_COLORS[i % TECH_COLORS.length]}` }}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--wp-text-3)' }}>{job.clientName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team filters */}
          {techs.length > 0 && (
            <div className="card p-3">
              <span className="text-xs font-bold block mb-2" style={{ color: 'var(--wp-text)' }}>
                {locale === 'es' ? 'Equipo' : 'Team'}
              </span>
              <div className="space-y-1.5">
                {techs.map((tech, i) => (
                  <label key={tech.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={techFilter.size === 0 || techFilter.has(tech.id)}
                      onChange={() => {
                        setTechFilter(prev => {
                          const next = new Set(prev)
                          if (next.has(tech.id)) { next.delete(tech.id) } else { next.add(tech.id) }
                          return next
                        })
                      }}
                      className="rounded" style={{ accentColor: TECH_COLORS[i % TECH_COLORS.length] }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: TECH_COLORS[i % TECH_COLORS.length] }} />
                    <span style={{ color: 'var(--wp-text-2)' }}>{tech.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: CALENDAR ── */}
        <div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Week view */}
        {view === 'week' && (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, i) => {
              const dayJobs = jobsForDay(filteredJobs, day)
              const isToday = sameDay(day, new Date())
              return (
                <DroppableDay key={i} day={day} isToday={isToday}>
                  <div className="flex items-center justify-between mb-2" style={{ color: isToday ? 'var(--wp-accent)' : 'var(--wp-text-muted)' }}>
                    <span className="text-xs font-semibold">{DAY_NAMES[day.getDay()]} {day.getDate()}</span>
                    <Link href={`/${locale}/jobs/new`} className="opacity-0 group-hover/day:opacity-100 transition-opacity p-0.5 rounded" title="Add job">
                      <Plus size={12} style={{ color: 'var(--wp-text-muted)' }} />
                    </Link>
                  </div>
                  {dayJobs.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--wp-border)' }}>{t.noJobs}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayJobs.map(job => (
                        <DraggableJob key={job.id} job={job} locale={locale} t={t} techName={techAssignments.find(a => a.jobId === job.id)?.technicianName} />
                      ))}
                    </div>
                  )}
                </DroppableDay>
              )
            })}
          </div>
        )}

        {/* Month view */}
        {view === 'month' && (
          <div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: 'var(--wp-text-muted)' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((day, i) => {
                if (!day) return <div key={i} className="min-h-[80px]" />
                const dayJobs = jobsForDay(filteredJobs, day)
                const isToday = sameDay(day, new Date())
                const dateStr = day.toISOString().split('T')[0]
                return (
                  <DroppableMonthDay key={i} day={day} isToday={isToday}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: isToday ? 'var(--wp-accent)' : 'var(--wp-text-muted)' }}>{day.getDate()}</span>
                    </div>
                    <div className="space-y-0.5">
                      {dayJobs.slice(0, 2).map(job => (
                        <DraggableMonthJob key={job.id} job={job} locale={locale} />
                      ))}
                      {dayJobs.length > 2 && (
                        <p className="text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>+{dayJobs.length - 2} more</p>
                      )}
                    </div>
                  </DroppableMonthDay>
                )
              })}
            </div>
          </div>
        )}

        {/* Drag overlay — ghost that follows cursor */}
        <DragOverlay>
          {activeJob && (
            <div className="p-2 rounded-lg bg-white shadow-xl w-[150px]" style={{ border: '1px solid var(--wp-border)' }}>
              <p className="text-xs font-medium truncate" style={{ color: 'var(--wp-primary)' }} title={activeJob.name}>{activeJob.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--wp-text-muted)' }} title={activeJob.clientName}>{activeJob.clientName}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
        </div>{/* end right calendar column */}
      </div>{/* end 2-col grid */}
    </div>
  )
}

// Month view droppable
function DroppableMonthDay({ day, children, isToday }: { day: Date; children: React.ReactNode; isToday: boolean }) {
  const dateStr = day.toISOString().split('T')[0]
  const { isOver, setNodeRef } = useDroppable({ id: `day-${dateStr}`, data: { date: day } })
  return (
    <div
      ref={setNodeRef}
      className={`card p-2 min-h-[80px] group/day transition-colors ${isOver ? 'bg-blue-50 ring-2' : ''}`}
      style={isToday ? { boxShadow: '0 0 0 2px var(--wp-accent)' } : undefined}
    >
      {children}
    </div>
  )
}

// Month view draggable job
function DraggableMonthJob({ job, locale }: { job: Job; locale: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`block text-[10px] font-medium text-white rounded px-1 py-0.5 truncate cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-30' : ''}`}
      style={{ background: 'var(--wp-primary)' }}
      title={`${job.name} — ${job.clientName}`}
    >
      {job.name}
    </div>
  )
}
