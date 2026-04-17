'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { MapPin, ChevronRight, Wrench, Calendar, Clock } from 'lucide-react'
import { isScheduledToday } from '@/lib/schedule'
import { ClientAvatar, Segmented, EmptyState } from '@/components/ui'

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

  const techOptions = [
    { value: '', label: 'All' },
    ...technicians.map(tech => ({ value: tech.id, label: tech.name })),
  ]

  return (
    <div className="px-4 pt-2 pb-4 max-w-lg mx-auto">
      <div className="hidden md:flex items-center gap-2 mb-4">
        <Wrench size={20} style={{ color: 'var(--wp-brand)' }} />
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--wp-text)' }}>{t.title}</h1>
      </div>

      {/* Technician filter */}
      {technicians.length > 0 && (
        <div className="mb-5">
          <Segmented
            value={selectedTechId ?? ''}
            onChange={handleTechFilter}
            options={techOptions}
          />
        </div>
      )}

      {/* Today's jobs */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.todaysJobs}</h2>
          <span className="text-[11px]" style={{ color: 'var(--wp-text-3)' }}>
            {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        {todayJobs.length === 0 ? (
          <EmptyState
            icon={<Calendar size={32} />}
            title={selectedTech ? `No jobs for ${selectedTech.name}` : 'No jobs today'}
            description={selectedTech ? 'Try a different technician or schedule a new job.' : t.noJobs}
            cta={
              <Link href={`/${locale}/jobs/new`} className="btn-primary btn-sm">
                + Schedule a job
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {todayJobs.map((job, idx) => (
              <Link
                key={job.id}
                href={`/${locale}/field/${job.id}`}
                className="card p-4 flex items-start gap-3 transition-all hover:border-[color:var(--wp-border-hover)]"
                style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
              >
                <ClientAvatar name={job.clientName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</p>
                    {job.startDate && (
                      <span className="flex items-center gap-0.5 text-xs shrink-0 font-medium" style={{ color: 'var(--wp-info-v2)' }}>
                        <Clock size={10} />
                        {new Date(job.startDate).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-2)' }}>{job.clientName}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'var(--wp-text-3)' }}>
                      <MapPin size={11} /> <span className="truncate">{job.address}</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 self-center" style={{ color: 'var(--wp-text-3)' }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--wp-text-3)' }}>Active jobs</h2>
          <div className="space-y-2">
            {upcomingJobs.map((job, idx) => (
              <Link
                key={job.id}
                href={`/${locale}/field/${job.id}`}
                className="card p-3 flex items-center gap-3 transition-all hover:border-[color:var(--wp-border-hover)]"
                style={{ animation: `fadeSlideIn 0.3s ease both`, animationDelay: `${idx * 30}ms` }}
              >
                <ClientAvatar name={job.clientName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text)' }}>{job.name}</p>
                    {job.startDate && (
                      <span className="flex items-center gap-0.5 text-[10px] shrink-0" style={{ color: 'var(--wp-text-3)' }}>
                        <Clock size={9} />
                        {new Date(job.startDate).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--wp-text-3)' }}>{job.clientName}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: 'var(--wp-text-3)' }}>
                      <MapPin size={9} /> <span className="truncate">{job.address}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={14} style={{ color: 'var(--wp-text-3)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
