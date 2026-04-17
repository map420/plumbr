'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteJob } from '@/lib/actions/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Briefcase, Plus, Trash2, LayoutGrid, List, Calendar } from 'lucide-react'
import {
  StatusPill, KpiCard, ClientAvatar, Segmented, Toolbar, EmptyState,
  type StatusTone,
} from '@/components/ui'

type Job = { id: string; name: string; clientName: string; status: string; startDate: Date | null; endDate: Date | null; budgetedCost: string | null; createdAt: Date }
type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Assignment = { jobId: string; technicianId: string; technicianName: string }
type Translations = {
  title: string; new: string; empty: string
  status: Record<JobStatus, string>
  fields: { name: string; clientName: string; startDate: string; endDate: string; budgetedCost: string }
}

type FilterValue = 'all' | JobStatus

const ALL_STATUSES: JobStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

const STATUS_TONE: Record<JobStatus, StatusTone> = {
  lead: 'neutral',
  active: 'active',
  on_hold: 'warning',
  completed: 'done',
  cancelled: 'declined',
}

export function JobsClient({ initialJobs, jobAssignments, planInfo, translations: t }: { initialJobs: Job[]; jobAssignments: Assignment[]; planInfo: { current: number; limit: number } | null; translations: Translations }) {
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterValue>('all')
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list')

  const filtered = initialJobs.filter(j => {
    const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase()) || j.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || j.status === filter
    return matchesSearch && matchesFilter
  })

  const grouped = filtered.reduce<Record<string, Job[]>>((acc, job) => {
    const date = job.startDate ? new Date(job.startDate) : new Date(job.createdAt)
    const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    if (!acc[key]) acc[key] = []
    acc[key].push(job)
    return acc
  }, {})
  const monthKeys = Object.keys(grouped)

  // KPIs
  const activeJobs = initialJobs.filter(j => j.status === 'active')
  const leadJobs = initialJobs.filter(j => j.status === 'lead')
  const onHoldJobs = initialJobs.filter(j => j.status === 'on_hold')
  const monthStart = new Date()
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const completedMTD = initialJobs.filter(j =>
    j.status === 'completed' && j.endDate && new Date(j.endDate) >= monthStart
  )
  const activeValue = activeJobs.reduce((s, j) => s + (j.budgetedCost ? parseFloat(j.budgetedCost) : 0), 0)

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteJob(deleteId); router.refresh() })
    setDeleteId(null)
  }

  const formatCurrency = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`

  // Segmented options
  const desktopFilterOptions = [
    { value: 'all' as FilterValue, label: 'All', count: initialJobs.length },
    ...ALL_STATUSES
      .filter(s => initialJobs.some(j => j.status === s))
      .map(s => ({
        value: s as FilterValue,
        label: t.status[s],
        count: initialJobs.filter(j => j.status === s).length,
      })),
  ]

  const mobileFilterOptions = [
    { value: 'all' as FilterValue, label: 'All', count: initialJobs.length },
    { value: 'active' as FilterValue, label: locale === 'es' ? 'Activos' : 'Active', count: activeJobs.length },
    { value: 'completed' as FilterValue, label: locale === 'es' ? 'Completados' : 'Done', count: initialJobs.filter(j => j.status === 'completed').length },
  ]

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full">
      {deleteId && (
        <ConfirmModal
          title="Delete Job"
          message="Are you sure you want to delete this job? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      {planInfo && <PlanLimitBanner current={planInfo.current} limit={planInfo.limit} resource="jobs" />}

      {/* Desktop header */}
      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">{t.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {initialJobs.length} {locale === 'es' ? 'total' : 'total'}
            {activeJobs.length > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-info-v2)', fontWeight: 500 }}>
                  {activeJobs.length}
                </span>
                {' '}
                {locale === 'es' ? 'activos' : 'active'}
              </>
            )}
            {activeValue > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--wp-text)', fontWeight: 500 }}>
                  {formatCurrency(activeValue)}
                </span>
                {' '}
                {locale === 'es' ? 'en progreso' : 'in pipeline'}
              </>
            )}
          </p>
        </div>
        <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm">
          <Plus size={14} /> {t.new}
        </Link>
      </div>

      {/* KPI row */}
      {initialJobs.length > 0 && (
        <div className="hidden md:grid grid-cols-4 gap-2.5 mb-5">
          <KpiCard
            tone="info"
            label={locale === 'es' ? 'Activos' : 'Active'}
            value={activeJobs.length}
            sub={activeValue > 0 ? `${formatCurrency(activeValue)} ${locale === 'es' ? 'en pipeline' : 'in pipeline'}` : undefined}
          />
          <KpiCard
            tone="neutral"
            label={locale === 'es' ? 'Prospectos' : 'Leads'}
            value={leadJobs.length}
            sub={leadJobs.length > 0 ? (locale === 'es' ? 'Por convertir' : 'To convert') : undefined}
          />
          <KpiCard
            tone="warning"
            label={locale === 'es' ? 'En pausa' : 'On hold'}
            value={onHoldJobs.length}
            sub={onHoldJobs.length > 0 ? (locale === 'es' ? 'Requieren atención' : 'Need attention') : undefined}
          />
          <KpiCard
            tone="success"
            label={locale === 'es' ? 'Completados MTD' : 'Done MTD'}
            value={completedMTD.length}
            sub={completedMTD.length > 0 ? (locale === 'es' ? 'Este mes' : 'This month') : undefined}
            subTone={completedMTD.length > 0 ? 'up' : 'neutral'}
          />
        </div>
      )}

      {/* Mobile search + segmented */}
      <div className="md:hidden">
        <input type="text"
          placeholder={locale === 'es' ? 'Buscar jobs...' : 'Search by job or client...'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none mb-3"
          style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text)' }}
        />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={mobileFilterOptions}
          className="mb-3"
        />
      </div>

      {/* Desktop toolbar */}
      <div className="hidden md:block">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={locale === 'es' ? 'Buscar por job o cliente...' : 'Search by job or client...'}
          right={
            <div className="flex items-center gap-3">
              <Segmented
                value={filter}
                onChange={setFilter}
                options={desktopFilterOptions}
              />
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--wp-border-v2)' }}>
                <button onClick={() => setViewMode('list')} className="p-2" title="List view"
                  style={{ background: viewMode === 'list' ? 'var(--wp-brand)' : 'var(--wp-surface)', color: viewMode === 'list' ? 'white' : 'var(--wp-text-3)' }}>
                  <List size={14} />
                </button>
                <button onClick={() => setViewMode('kanban')} className="p-2" title="Kanban view"
                  style={{ background: viewMode === 'kanban' ? 'var(--wp-brand)' : 'var(--wp-surface)', color: viewMode === 'kanban' ? 'white' : 'var(--wp-text-3)' }}>
                  <LayoutGrid size={14} />
                </button>
                <button onClick={() => router.push(`/${locale}/schedule`)} className="p-2" title="Calendar view"
                  style={{ background: 'var(--wp-surface)', color: 'var(--wp-text-3)' }}>
                  <Calendar size={14} />
                </button>
              </div>
            </div>
          }
        />
      </div>

      {initialJobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={36} />}
          title={t.empty}
          cta={
            <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm">
              <Plus size={14} /> {t.new}
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center" style={{ color: 'var(--wp-text-3)', fontSize: '0.875rem' }}>
          {locale === 'es' ? 'Sin resultados.' : 'No jobs match your search.'}
        </div>
      ) : (
        <>
          {/* Mobile list */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              return (
                <div key={month}>
                  <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text)' }}>{month}</span>
                  </div>
                  {items.map((job, idx) => (
                    <div key={job.id} onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
                      onTouchStart={() => router.prefetch(`/${locale}/jobs/${job.id}`)}
                      className="cursor-pointer active:bg-[var(--wp-surface-2)] flex gap-3 items-start"
                      style={{
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--wp-border-light)',
                        animation: 'fadeSlideIn 0.3s ease both',
                        animationDelay: `${idx * 30}ms`,
                      }}>
                      <ClientAvatar name={job.clientName} size="md" className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text)' }} className="truncate">{job.name}</span>
                          {job.budgetedCost && parseFloat(job.budgetedCost) > 0 && (
                            <span className="text-price shrink-0" style={{ fontSize: '0.9375rem', color: 'var(--wp-text)' }}>
                              ${parseFloat(job.budgetedCost).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>
                            {job.clientName}
                            {job.startDate && <> · {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                          </span>
                          <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Desktop Kanban view */}
          {viewMode === 'kanban' && (
            <div className="hidden md:grid grid-cols-4 gap-3" style={{ opacity: isPending ? 0.5 : 1 }}>
              {(['lead', 'active', 'on_hold', 'completed'] as JobStatus[]).map(status => {
                const statusJobs = filtered.filter(j => j.status === status)
                const dotColors: Record<string, string> = { lead: 'var(--wp-text-3)', active: 'var(--wp-warning-v2)', on_hold: 'var(--wp-info-v2)', completed: 'var(--wp-success-v2)' }
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: dotColors[status] }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.status[status]}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>{statusJobs.length}</span>
                    </div>
                    <div className="space-y-2">
                      {statusJobs.map(job => {
                        const isOnHold = job.status === 'on_hold'
                        // Progress: estimate from start to end date
                        let progress = status === 'completed' ? 100 : status === 'lead' ? 0 : 50
                        if (job.startDate && job.endDate) {
                          const start = new Date(job.startDate).getTime()
                          const end = new Date(job.endDate).getTime()
                          const now = Date.now()
                          progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
                        }
                        return (
                          <Link key={job.id} href={`/${locale}/jobs/${job.id}`}
                            className="block p-3 rounded-xl transition-all hover:border-[color:var(--wp-brand)]"
                            style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-1)', borderLeft: isOnHold ? '2px solid var(--wp-error-v2)' : undefined }}>
                            <p className="text-[10px] font-mono" style={{ color: 'var(--wp-text-3)' }}>JOB-{job.id.slice(0, 4)}</p>
                            <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--wp-text-3)' }}>👤 {job.clientName}</p>
                            <div className="flex items-center justify-between mt-2">
                              {job.startDate && <span className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                              {job.budgetedCost && parseFloat(job.budgetedCost) > 0 && (
                                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${parseFloat(job.budgetedCost).toLocaleString()}</span>
                              )}
                            </div>
                            {/* Progress bar */}
                            {status !== 'lead' && (
                              <div className="mt-2 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--wp-surface-3)' }}>
                                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: dotColors[status] }} />
                              </div>
                            )}
                          </Link>
                        )
                      })}
                      {statusJobs.length === 0 && (
                        <div className="py-8 text-center text-xs rounded-xl" style={{ border: '1px dashed var(--wp-border-v2)', color: 'var(--wp-text-3)' }}>
                          No jobs
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Desktop table (list view) */}
          <div
            className={`hidden ${viewMode === 'list' ? 'md:block' : ''} ${isPending ? 'opacity-50' : ''}`}
            style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', borderRadius: 10, overflow: 'hidden' }}
          >
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm min-w-[720px]">
                <thead style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.name}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.clientName}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.startDate}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.fields.budgetedCost}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Team</th>
                    <th className="px-4 py-3 w-14" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
                      onMouseEnter={() => router.prefetch(`/${locale}/jobs/${job.id}`)}
                      className="group cursor-pointer hover:bg-[var(--wp-surface-2)] transition-colors"
                      style={{ borderBottom: '1px solid var(--wp-border-light)' }}
                    >
                      <td className="px-4 py-3 font-medium max-w-[220px] truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ClientAvatar name={job.clientName} size="md" />
                          <span className="truncate" style={{ color: 'var(--wp-text-2)' }}>{job.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={STATUS_TONE[job.status as JobStatus] ?? 'neutral'}>
                          {t.status[job.status as JobStatus] ?? job.status}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--wp-text-2)' }}>
                        {job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--wp-text)' }}>
                        {job.budgetedCost && parseFloat(job.budgetedCost) > 0 ? `$${parseFloat(job.budgetedCost).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <TechAvatars techs={jobAssignments.filter(a => a.jobId === job.id)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(job.id) }}
                          className="btn-ghost p-1.5 hover:!text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ minHeight: 'auto' }}
                          aria-label="Delete job"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TechAvatars({ techs }: { techs: Assignment[] }) {
  if (techs.length === 0) return <span className="text-xs" style={{ color: 'var(--wp-border-v2)' }}>—</span>
  const visible = techs.slice(0, 3)
  const extra = techs.length - visible.length
  return (
    <div className="flex items-center">
      {visible.map((t, i) => (
        <div key={t.technicianId} title={t.technicianName}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
          style={{ background: 'var(--wp-brand)', marginLeft: i > 0 ? '-6px' : 0 }}>
          {t.technicianName.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white"
          style={{ background: 'var(--wp-surface-3)', color: 'var(--wp-text-3)', marginLeft: '-6px' }}>
          +{extra}
        </div>
      )}
    </div>
  )
}
