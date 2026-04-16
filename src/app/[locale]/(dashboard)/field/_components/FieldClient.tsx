'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { MapPin, ChevronRight, Wrench, Users, Calendar, Clock } from 'lucide-react'
import { isScheduledToday } from '@/lib/schedule'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; address: string | null; startDate: Date | null }
type Technician = { id: string; name: string }
type T = {
  title: string; todaysJobs: string; noJobs: string
  status: Record<JobStatus, string>
  fields: { address: string; clientName: string }
}

export function FieldClient({ initialJobs, technicians, selectedTechId, translations: t }: {
  initialJobs: Job[]; technicians: Technician[]; selectedTechId: string | null; translations: T
}) {
  const locale = useLocale()
  const router = useRouter()
  const todayJobs = initialJobs.filter(j => isScheduledToday(j))
  const upcomingJobs = initialJobs.filter(j => j.status === 'active' && !isScheduledToday(j)).slice(0, 5)
  const selectedTech = selectedTechId ? technicians.find(t => t.id === selectedTechId) : null

  function handleTechFilter(techId: string) {
    const params = techId ? `?tech=${techId}` : ''
    router.push(`/${locale}/field${params}`)
  }

  return (
    <div className="px-4 pt-2 pb-4 max-w-lg mx-auto">
      <div className="hidden md:flex items-center gap-2 mb-4">
        <Wrench size={20} style={{ color: 'var(--wp-accent)' }} />
        <h1 className="text-xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{t.title}</h1>
      </div>

      {/* Technician filter */}
      {technicians.length > 0 && (
        <div className="mb-5">
          <div className="hidden md:flex items-center gap-2 mb-2">
            <Users size={13} style={{ color: 'var(--wp-text-muted)' }} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--wp-text-tertiary)' }}>Filter by Technician</span>
          </div>
          {/* Mobile: tab-bar style */}
          <div className="tab-bar mb-1 md:hidden">
            <button onClick={() => handleTechFilter('')}
              className={`tab-bar-item ${!selectedTechId ? 'tab-bar-item-active' : ''}`}>
              All
            </button>
            {technicians.map(tech => (
              <button key={tech.id} onClick={() => handleTechFilter(tech.id)}
                className={`tab-bar-item ${selectedTechId === tech.id ? 'tab-bar-item-active' : ''}`}>
                {tech.name}
              </button>
            ))}
          </div>
          {/* Desktop: pill style */}
          <div className="hidden md:flex flex-wrap gap-2">
            <button onClick={() => handleTechFilter('')}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
              style={{ background: !selectedTechId ? 'var(--wp-primary)' : 'var(--wp-bg-muted)', color: !selectedTechId ? 'white' : 'var(--wp-text-secondary)' }}>
              All
            </button>
            {technicians.map(tech => (
              <button key={tech.id} onClick={() => handleTechFilter(tech.id)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                style={{ background: selectedTechId === tech.id ? 'var(--wp-primary)' : 'var(--wp-bg-muted)', color: selectedTechId === tech.id ? 'white' : 'var(--wp-text-secondary)' }}>
                {tech.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-accent)' }}>{t.todaysJobs}</h2>
          <span className="text-xs" style={{ color: 'var(--wp-text-tertiary)' }}>{new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        {todayJobs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--wp-bg-muted)' }}>
              <Calendar size={24} style={{ color: 'var(--wp-text-muted)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--wp-text-primary)' }}>
              {selectedTech ? `No jobs for ${selectedTech.name}` : 'No jobs today'}
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--wp-text-muted)' }}>
              {selectedTech ? 'Try selecting a different technician or schedule a new job.' : t.noJobs}
            </p>
            <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs">
              + Schedule a job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job, idx) => (
              <Link
                key={job.id}
                href={`/${locale}/field/${job.id}`}
                className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</p>
                    {job.startDate && (
                      <span className="flex items-center gap-0.5 text-xs shrink-0" style={{ color: 'var(--wp-text-muted)' }}>
                        <Clock size={10} />
                        {new Date(job.startDate).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-secondary)' }}>{job.clientName}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--wp-text-tertiary)' }}>
                      <MapPin size={11} /> {job.address}
                    </div>
                  )}
                  <div className="mt-2">
                    <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                  </div>
                </div>
                <ChevronRight size={18} className="ml-3 shrink-0" style={{ color: 'var(--wp-text-tertiary)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--wp-text-tertiary)' }}>Active Jobs</h2>
          <div className="space-y-2">
            {upcomingJobs.map((job, idx) => (
              <Link
                key={job.id}
                href={`/${locale}/field/${job.id}`}
                className="card p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</p>
                    {job.startDate && (
                      <span className="flex items-center gap-0.5 text-[10px] shrink-0" style={{ color: 'var(--wp-text-muted)' }}>
                        <Clock size={9} />
                        {new Date(job.startDate).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--wp-text-tertiary)' }}>{job.clientName}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>
                      <MapPin size={9} /> {job.address}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} style={{ color: 'var(--wp-text-tertiary)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
