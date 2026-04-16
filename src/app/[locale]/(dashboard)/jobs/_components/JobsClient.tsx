'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { deleteJob } from '@/lib/actions/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { PlanLimitBanner } from '@/components/PlanLimitBanner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Briefcase, Plus, Trash2 } from 'lucide-react'

type Job = { id: string; name: string; clientName: string; status: string; startDate: Date | null; endDate: Date | null; budgetedCost: string | null; createdAt: Date }
type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Assignment = { jobId: string; technicianId: string; technicianName: string }
type Translations = {
  title: string; new: string; empty: string
  status: Record<JobStatus, string>
  fields: { name: string; clientName: string; startDate: string; endDate: string; budgetedCost: string }
}

const ALL_STATUSES: JobStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

export function JobsClient({ initialJobs, jobAssignments, planInfo, translations: t }: { initialJobs: Job[]; jobAssignments: Assignment[]; planInfo: { current: number; limit: number } | null; translations: Translations }) {
  const locale = useLocale()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => { await deleteJob(deleteId); router.refresh() })
    setDeleteId(null)
  }

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

      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">{t.title}</h1>
        <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm">
          <Plus size={14} /> {t.new}
        </Link>
      </div>

      <div className="mb-3">
        <input type="text" placeholder="Search by job or client..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-primary)' }}
        />
      </div>

      <div className="tab-bar mb-1 md:hidden">
        <button onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}
          className={`tab-bar-item ${filter === 'active' ? 'tab-bar-item-active' : ''}`}>Active</button>
        <button onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
          className={`tab-bar-item ${filter === 'completed' ? 'tab-bar-item-active' : ''}`}>Completed</button>
        <button onClick={() => setFilter('all')}
          className={`tab-bar-item ${filter === 'all' ? 'tab-bar-item-active' : ''}`}>All</button>
      </div>

      <div className="hidden md:flex tab-pills mb-1">
        <button onClick={() => setFilter('all')} className={`tab-pill ${filter === 'all' ? 'tab-pill-active' : ''}`}>All <span className="ml-1 opacity-60">{initialJobs.length}</span></button>
        {ALL_STATUSES.map((s) => {
          const count = initialJobs.filter(j => j.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setFilter(s)} className={`tab-pill ${filter === s ? 'tab-pill-active' : ''}`}>
              {t.status[s]} <span className="ml-1 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {initialJobs.length === 0 ? (
        <div className="card empty-state">
          <Briefcase size={36} className="empty-state-icon" />
          <p className="empty-state-text">{t.empty}</p>
          <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm"><Plus size={14} /> {t.new}</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center" style={{ color: 'var(--wp-text-muted)', fontSize: '0.875rem' }}>No jobs match your search.</div>
      ) : (
        <>
          {/* Mobile list */}
          <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
            {monthKeys.map((month, mi) => {
              const items = grouped[month]
              return (
                <div key={month}>
                  <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                    style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text-primary)' }}>{month}</span>
                  </div>
                  {items.map((job, idx) => (
                    <div key={job.id} onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
                      onTouchStart={() => router.prefetch(`/${locale}/jobs/${job.id}`)}
                      className="cursor-pointer active:bg-[var(--wp-bg-muted)]"
                      style={{
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--wp-border-light)',
                        animation: 'fadeSlideIn 0.3s ease both',
                        animationDelay: `${idx * 30}ms`,
                      }}>
                      <div className="flex items-baseline justify-between">
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text-primary)' }} className="truncate min-w-0">{job.name}</span>
                        {job.budgetedCost && parseFloat(job.budgetedCost) > 0 && (
                          <span className="text-price shrink-0 ml-2" style={{ fontSize: '0.9375rem', color: 'var(--wp-text-primary)' }}>
                            ${parseFloat(job.budgetedCost).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>
                          {job.clientName}
                          {job.startDate && <> · {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>}
                        </span>
                        <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className={`hidden md:block card overflow-hidden ${isPending ? 'opacity-50' : ''}`}>
            <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.name}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.clientName}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.startDate}</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.endDate}</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>{t.fields.budgetedCost}</th>
                  <th className="px-4 py-3 font-medium" style={{ color: 'var(--wp-text-muted)' }}>Team</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id} onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid var(--wp-border-light)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--wp-bg-muted)'; router.prefetch(`/${locale}/jobs/${job.id}`) }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate" style={{ color: 'var(--wp-text-secondary)' }}>{job.clientName}</td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>
                      {job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--wp-text-muted)' }}>
                      {job.endDate ? new Date(job.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--wp-text-primary)' }}>
                      {job.budgetedCost && parseFloat(job.budgetedCost) > 0 ? `$${parseFloat(job.budgetedCost).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <TechAvatars techs={jobAssignments.filter(a => a.jobId === job.id)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); setDeleteId(job.id) }} className="transition-colors" style={{ color: 'var(--wp-text-muted)' }} aria-label="Delete job">
                        <Trash2 size={15} />
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
  if (techs.length === 0) return <span className="text-xs" style={{ color: 'var(--wp-border)' }}>—</span>
  const visible = techs.slice(0, 3)
  const extra = techs.length - visible.length
  return (
    <div className="flex items-center">
      {visible.map((t, i) => (
        <div key={t.technicianId} title={t.technicianName}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white"
          style={{ background: 'var(--wp-primary)', marginLeft: i > 0 ? '-6px' : 0 }}>
          {t.technicianName.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white"
          style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)', marginLeft: '-6px' }}>
          +{extra}
        </div>
      )}
    </div>
  )
}
