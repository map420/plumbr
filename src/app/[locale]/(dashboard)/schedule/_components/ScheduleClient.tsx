'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, LayoutGrid, GripVertical } from 'lucide-react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { updateJob } from '@/lib/actions/jobs'
import { Toast } from '@/components/Toast'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; startDate: Date | null; endDate: Date | null }
type T = { title: string; today: string; noJobs: string; status: Record<JobStatus, string> }

function startOfWeek(date: Date) {
  // ISO-like: weeks start on Monday (day 1). Sunday = 0 becomes the 7th day.
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function jobsForDay(jobs: Job[], day: Date) {
  // LST-006 — exclude completed/cancelled jobs from Schedule views even if their
  // date range overlaps the day. Only "in-flight" jobs belong on the calendar.
  return jobs.filter((j) => {
    if (!j.startDate) return false
    if (j.status === 'completed' || j.status === 'cancelled') return false
    const start = new Date(j.startDate); start.setHours(0, 0, 0, 0)
    if (j.endDate) {
      const end = new Date(j.endDate); end.setHours(23, 59, 59, 999)
      return day >= start && day <= end
    }
    return sameDay(start, day)
  })
}

// Helpers de locale — usan Intl.DateTimeFormat para producir nombres localizados.
// Evitamos arrays hardcoded en cualquier idioma.
function bcp47(locale: string) { return locale === 'es' ? 'es-ES' : 'en-US' }
function weekdayShort(dayIndex: number, locale: string) {
  // Ref: 7 de enero de 2024 = domingo (dayIndex 0).
  const d = new Date(2024, 0, 7 + dayIndex)
  return new Intl.DateTimeFormat(bcp47(locale), { weekday: 'short' }).format(d).replace(/\.$/, '')
}
function monthLong(monthIndex: number, locale: string) {
  const d = new Date(2024, monthIndex, 1)
  return new Intl.DateTimeFormat(bcp47(locale), { month: 'long' }).format(d)
}
function hourLabel(h: number, locale: string) {
  const d = new Date(2024, 0, 1, h)
  return new Intl.DateTimeFormat(bcp47(locale), { hour: 'numeric', hour12: true }).format(d)
}

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
        <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing shrink-0 touch-none" style={{ color: 'var(--wp-border)' }} aria-label="Drag to reorder">
          <GripVertical size={12} />
        </button>
        <Link href={`/${locale}/projects/${job.id}`} className="min-w-0 flex-1">
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
  const ts = useTranslations('schedule')
  const router = useRouter()
  const [jobs, setJobs] = useState(initialJobs)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' } | null>(null)
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
        const proceed = confirm(`⚠️ Schedule conflict: ${jobTechAssignment.technicianName} is already assigned to "${conflicts[0].name}" on ${targetDate.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}.\n\nMove anyway?`)
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
    try {
      await updateJob(jobId, { startDate: newStart.toISOString() })
      setToast({ message: locale === 'es' ? `${job.name} movido` : `${job.name} moved`, variant: 'success' })
      router.refresh()
    } catch {
      // Revert on error
      setJobs(initialJobs)
      setToast({ message: locale === 'es' ? 'Error al mover el proyecto' : 'Failed to move project', variant: 'error' })
    }
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
    // Monday-first: convertir getDay() (0=Sun..6=Sat) a offset desde lunes.
    // Consistente con mini cal + startOfWeek ISO-like de línea 21.
    const dow = firstDay.getDay()
    const startPad = dow === 0 ? 6 : dow - 1
    const cells: (Date | null)[] = Array(startPad).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }

  const monthGrid = getMonthGrid(monthDate)

  const headerLabel = view === 'week'
    ? `${weekDays[0].toLocaleString('en', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `${monthLong(monthDate.getMonth(), locale)} ${monthDate.getFullYear()}`

  const mobileDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i - 1)
    d.setHours(0, 0, 0, 0)
    return d
  })

  return (
    <div className="px-4 pt-2 pb-4 md:p-8">
      {toast && <Toast message={toast.message} variant={toast.variant} onDone={() => setToast(null)} />}
      <div className="hidden md:flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text)' }}>{t.title}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
            {locale === 'es'
              ? `Semana del ${weekDays[1].getDate()}–${weekDays[5].getDate()} de ${monthLong(weekDays[1].getMonth(), locale)} · ${jobs.length} ${ts('events.scheduledJobs')} · ${todayJobs.length} hoy`
              : `${jobs.length} ${ts('events.scheduledJobs')} · ${todayJobs.length} today`}
          </p>
        </div>
        <button className="btn-primary btn-sm">+ {ts('nav.newEvent')}</button>
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
                  {isToday ? ts('nav.today') : day.toLocaleDateString(bcp47(locale), { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {dayJobs.length === 0 ? (
                <p className="text-xs pl-1 mt-2" style={{ color: 'var(--wp-text-tertiary)' }}>{t.noJobs}</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {dayJobs.map((job, idx) => (
                    <Link
                      key={job.id}
                      href={`/${locale}/projects/${job.id}`}
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
                {monthLong(miniCalMonth.getMonth(), locale)} {miniCalMonth.getFullYear()}
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
              {[1,2,3,4,5,6,0].map(i => {
                // Narrow (1-letter) abbreviations, Monday-first.
                const d = new Date(2024, 0, 7 + i)
                const label = new Intl.DateTimeFormat(bcp47(locale), { weekday: 'narrow' }).format(d)
                return <div key={i} className="text-center text-[9px] font-semibold py-1" style={{ color: 'var(--wp-text-3)' }}>{label}</div>
              })}
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
                    style={isToday ? { background: 'var(--wp-brand)', color: 'var(--wp-text-inverse)', fontWeight: 700 } : { color: 'var(--wp-text-2)' }}>
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
                {ts('nav.today')} · {todayJobs.length} jobs
              </span>
              {/* C4 — Today button: resetea semana/vista a hoy */}
              <button
                type="button"
                onClick={() => { setWeekStart(startOfWeek(new Date())); setView('week') }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded hover:bg-[var(--wp-surface-2)]"
                style={{ color: 'var(--wp-brand)' }}
              >
                {ts('nav.jumpToday')}
              </button>
            </div>
            {todayJobs.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{t.noJobs}</p>
            ) : (
              <div className="space-y-1.5">
                {todayJobs.map((job, i) => {
                  const assignment = techAssignments.find(a => a.jobId === job.id)
                  const color = assignment ? (TECH_COLORS[techs.findIndex(t => t.id === assignment.technicianId) % TECH_COLORS.length] || TECH_COLORS[0]) : TECH_COLORS[i % TECH_COLORS.length]
                  const timeStr = job.startDate ? new Date(job.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
                  const initials = job.clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <Link key={job.id} href={`/${locale}/projects/${job.id}`}
                      className="flex items-center gap-2 p-1.5 rounded-md transition-colors hover:bg-[var(--wp-surface-2)]"
                      style={{ borderLeft: `2px solid ${color}` }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <div className="min-w-0">
                        <p className="text-xs truncate" style={{ color: 'var(--wp-text-2)' }}>
                          {timeStr && <span className="font-medium" style={{ color: 'var(--wp-text)' }}>{timeStr} · </span>}
                          {job.name} · {initials}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Team filters */}
          {techs.length > 0 && (
            <div className="card p-3">
              <span className="text-xs font-bold block mb-2" style={{ color: 'var(--wp-text)' }}>
                {ts('filter.technicians')}
              </span>
              <div className="space-y-1.5">
                {techs.map((tech, i) => {
                  const techJobCount = techAssignments.filter(a => a.technicianId === tech.id).length
                  return (
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
                      <span className="flex-1" style={{ color: 'var(--wp-text-2)' }}>{tech.name}</span>
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--wp-text-3)' }}>{techJobCount}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: CALENDAR ── */}
        <div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Week view — time-slot grid */}
        {view === 'week' && (() => {
          const HOUR_HEIGHT = 60
          const HEADER_HEIGHT = 44
          const displayDays = weekDays // Mon-Sun (7 days, starts Monday)

          // Dynamic hour range based on actual jobs
          let minH = 8, maxH = 18
          const allWeekJobs = displayDays.flatMap(d => jobsForDay(filteredJobs, d))
          for (const j of allWeekJobs) {
            if (!j.startDate) continue
            const sh = new Date(j.startDate).getHours()
            const eh = j.endDate ? new Date(j.endDate).getHours() + 1 : sh + 2
            if (sh < minH) minH = sh
            if (eh > maxH) maxH = eh
          }
          // Also include current hour if today is in range
          const nowHour = new Date().getHours()
          if (nowHour < minH) minH = nowHour
          if (nowHour + 1 > maxH) maxH = nowHour + 1
          // Clamp and add padding
          const START_HOUR = Math.max(0, minH - 1)
          const END_HOUR = Math.min(24, maxH + 1)
          const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

          // Build tech color map
          const techColorMap = new Map<string, string>()
          techs.forEach((tech, i) => techColorMap.set(tech.id, TECH_COLORS[i % TECH_COLORS.length]))

          const totalWeekJobs = displayDays.reduce((s, d) => s + jobsForDay(filteredJobs, d).length, 0)
          const weekNum = Math.ceil((weekDays[0].getDate() + new Date(weekDays[0].getFullYear(), weekDays[0].getMonth(), 1).getDay()) / 7)

          const calTitle = `${weekDays[0].toLocaleString(locale === 'es' ? 'es' : 'en', { month: 'long' })} ${weekDays[0].getDate()} – ${weekDays[6].getDate()}, ${weekDays[0].getFullYear()}`
          const calSub = `${ts('nav.week')} ${weekNum} · ${totalWeekJobs} ${locale === 'es' ? 'eventos' : 'events'}`

          return (
              <TimeSlotGrid
                hours={hours}
                displayDays={displayDays}
                filteredJobs={filteredJobs}
                techAssignments={techAssignments}
                techColorMap={techColorMap}
                locale={locale}
                START_HOUR={START_HOUR}
                HOUR_HEIGHT={HOUR_HEIGHT}
                HEADER_HEIGHT={68}
                calTitle={calTitle}
                calSub={calSub}
                onPrev={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                onNext={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                onToday={() => setWeekStart(startOfWeek(new Date()))}
                onMonthView={() => setView('month')}
              />
          )
        })()}

        {/* Month view */}
        {view === 'month' && (
          <div>
            <div className="grid grid-cols-7 mb-1">
              {/* Monday-first header (consistente con mini cal + startOfWeek) */}
              {[1,2,3,4,5,6,0].map(i => (
                <div key={i} className="text-center text-xs font-semibold py-2" style={{ color: 'var(--wp-text-muted)' }}>{weekdayShort(i, locale)}</div>
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
                        <p className="text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>{ts('events.moreEvents', { count: dayJobs.length - 2 })}</p>
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
            <div className="p-2 rounded-lg bg-card shadow-xl w-[150px]" style={{ border: '1px solid var(--wp-border)' }}>
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

// ── TimeSlotGrid: scrollable calendar with current-time line ──
function TimeSlotGrid({ hours, displayDays, filteredJobs, techAssignments, techColorMap, locale, START_HOUR, HOUR_HEIGHT, HEADER_HEIGHT, calTitle, calSub, onPrev, onNext, onToday, onMonthView }: {
  hours: number[]; displayDays: Date[]; filteredJobs: Job[]; techAssignments: TechAssignment[]
  techColorMap: Map<string, string>; locale: string; START_HOUR: number; HOUR_HEIGHT: number; HEADER_HEIGHT: number
  calTitle: string; calSub: string; onPrev: () => void; onNext: () => void; onToday: () => void; onMonthView: () => void
}) {
  const ts = useTranslations('schedule')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(new Date())

  // Auto-scroll to center current time line in viewport
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const currentH = new Date().getHours() + new Date().getMinutes() / 60
        const currentTimeOffset = (currentH - START_HOUR) * HOUR_HEIGHT
        const viewportHeight = scrollRef.current.clientHeight
        scrollRef.current.scrollTop = Math.max(0, currentTimeOffset - viewportHeight / 2)
      }
    })
  }, [START_HOUR, HOUR_HEIGHT])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const nowH = now.getHours() + now.getMinutes() / 60
  const nowTop = HEADER_HEIGHT + (nowH - START_HOUR) * HOUR_HEIGHT
  const isNowVisible = nowH >= START_HOUR && nowH <= START_HOUR + hours.length

  // Check if today is one of the display days
  const todayColIndex = displayDays.findIndex(d => sameDay(d, now))

  return (
    <div className="card overflow-hidden" style={{ padding: 0 }}>
      {/* Calendar title + nav + day headers — all inside the card */}
      <div className="px-4 py-3 flex items-start justify-between" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--wp-text)' }}>{calTitle}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>{calSub}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onPrev} className="p-1.5 rounded-lg" style={{ border: '1px solid var(--wp-border-v2)', color: 'var(--wp-text-3)' }} aria-label={ts('nav.previous')}>
            <ChevronLeft size={14} />
          </button>
          <button onClick={onToday} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ border: '1px solid var(--wp-border-v2)', color: 'var(--wp-text-2)' }}>
            {ts('nav.today')}
          </button>
          <button onClick={onNext} className="p-1.5 rounded-lg" style={{ border: '1px solid var(--wp-border-v2)', color: 'var(--wp-text-3)' }} aria-label={ts('nav.next')}>
            <ChevronRight size={14} />
          </button>
          <div className="flex rounded-lg overflow-hidden ml-1" style={{ border: '1px solid var(--wp-border-v2)' }}>
            <button className="text-[10px] px-2 py-1.5 font-medium" style={{ background: 'var(--wp-brand)', color: 'var(--wp-text-inverse)' }}>{ts('nav.week')}</button>
            <button onClick={onMonthView} className="text-[10px] px-2 py-1.5 font-medium" style={{ color: 'var(--wp-text-3)' }}>{ts('nav.month')}</button>
          </div>
        </div>
      </div>

      {/* Day column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(5, 1fr)' }}>
        <div style={{ height: 44, background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }} />
        {displayDays.map((day, di) => {
          const isToday = sameDay(day, now)
          return (
            <div key={di} className="text-center py-1.5" style={{ height: 44, background: isToday ? 'color-mix(in srgb, var(--wp-info-v2) 8%, white)' : 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)', borderLeft: '1px solid var(--wp-border-light)' }}>
              <div className="text-[10px] font-medium" style={{ color: isToday ? 'var(--wp-brand)' : 'var(--wp-text-3)' }}>
                {weekdayShort(day.getDay(), locale)}
              </div>
              <div className="text-base font-bold" style={{ color: isToday ? 'var(--wp-brand)' : 'var(--wp-text)' }}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable body — max 8 hours visible (~480px) */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 480 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(5, 1fr)', position: 'relative' }}>
          {/* Time labels column */}
          <div>
            {hours.map(h => (
              <div key={h} className="text-[10px] font-medium text-right pr-2 flex items-start justify-end" style={{ height: HOUR_HEIGHT, color: 'var(--wp-text-3)', borderBottom: '1px solid var(--wp-border-light)', paddingTop: 2 }}>
                {hourLabel(h, locale)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDays.map((day, di) => {
            const dayJobs = jobsForDay(filteredJobs, day)
            const isToday = sameDay(day, now)

            return (
              <div key={di} style={{ position: 'relative', borderLeft: '1px solid var(--wp-border-light)', background: isToday ? 'color-mix(in srgb, var(--wp-info-v2) 8%, white)' : undefined }}>
                {/* Hour cells */}
                {hours.map(h => (
                  <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--wp-border-light)' }} />
                ))}

                {/* Events */}
                {dayJobs.map(job => {
                  if (!job.startDate) return null
                  const start = new Date(job.startDate)
                  const startH = start.getHours() + start.getMinutes() / 60
                  const endH = job.endDate
                    ? new Date(job.endDate).getHours() + new Date(job.endDate).getMinutes() / 60
                    : startH + 2
                  const top = (startH - START_HOUR) * HOUR_HEIGHT
                  const height = Math.max((endH - startH) * HOUR_HEIGHT, 40)

                  const assignment = techAssignments.find(a => a.jobId === job.id)
                  const color = assignment ? (techColorMap.get(assignment.technicianId) ?? '#1D4ED8') : '#1D4ED8'
                  const techName = assignment?.technicianName?.split(' ')[0] ?? ''
                  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
                  const isActive = job.status === 'active'

                  return (
                    <Link key={job.id} href={`/${locale}/projects/${job.id}`}
                      className="absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden transition-shadow hover:shadow-md z-10"
                      style={{
                        top, height,
                        background: `color-mix(in srgb, ${color} 10%, white)`,
                        borderLeft: `3px solid ${color}`,
                        outline: isActive && isToday ? `2px solid ${color}` : undefined,
                        outlineOffset: isActive && isToday ? 1 : undefined,
                      }}>
                      <div className="text-[10px] font-medium" style={{ color }}>{timeStr} · {techName}{isActive && isToday ? ` · ${ts('status.inProgress')}` : ''}</div>
                      <div className="text-xs font-semibold mt-0.5 truncate" style={{ color: 'var(--wp-text)' }}>{job.name} · {job.clientName}</div>
                    </Link>
                  )
                })}
              </div>
            )
          })}

          {/* Current time line — spans across all columns */}
          {isNowVisible && (
            <div className="absolute pointer-events-none z-20" style={{
              top: (nowH - START_HOUR) * HOUR_HEIGHT,
              left: 50,
              right: 0,
              height: 0,
            }}>
              {/* Red dot on left edge */}
              <div className="absolute rounded-full" style={{ width: 8, height: 8, background: '#EF4444', left: -4, top: -4 }} />
              {/* Red line */}
              <div style={{ height: 2, background: '#EF4444', width: '100%' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
