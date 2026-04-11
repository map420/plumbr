'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { MapPin, ChevronRight, Smartphone, Users } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; address: string | null; startDate: Date | null }
type Technician = { id: string; name: string }
type T = {
  title: string; todaysJobs: string; noJobs: string
  status: Record<JobStatus, string>
  fields: { address: string; clientName: string }
}

function isToday(date: Date) {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
}

export function FieldClient({ initialJobs, technicians, selectedTechId, translations: t }: {
  initialJobs: Job[]; technicians: Technician[]; selectedTechId: string | null; translations: T
}) {
  const locale = useLocale()
  const router = useRouter()
  const active = initialJobs.filter(j => j.status === 'active')
  const todayJobs = active.filter(j => j.startDate && isToday(new Date(j.startDate)))
  const upcomingJobs = active.filter(j => !j.startDate || !isToday(new Date(j.startDate))).slice(0, 5)

  function handleTechFilter(techId: string) {
    const params = techId ? `?tech=${techId}` : ''
    router.push(`/${locale}/field${params}`)
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Smartphone size={20} className="text-[#F97316]" />
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
      </div>

      {/* Technician filter */}
      {technicians.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={13} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Filter by Technician</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleTechFilter('')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${!selectedTechId ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              All
            </button>
            {technicians.map(tech => (
              <button key={tech.id} onClick={() => handleTechFilter(tech.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selectedTechId === tech.id ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {tech.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t.todaysJobs}</h2>
        {todayJobs.length === 0 ? (
          <div className="plumbr-card p-6 text-center text-slate-400 text-sm">{t.noJobs}</div>
        ) : (
          <div className="space-y-3">
            {todayJobs.map(job => (
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
                    <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 ml-3 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Active Jobs</h2>
          <div className="space-y-2">
            {upcomingJobs.map(job => (
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
