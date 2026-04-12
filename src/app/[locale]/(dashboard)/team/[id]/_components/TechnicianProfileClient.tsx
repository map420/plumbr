'use client'

import Link from 'next/link'
import { Mail, Phone, DollarSign, Clock, ArrowLeft, Briefcase } from 'lucide-react'

type Technician = { id: string; name: string; email: string; phone: string | null; hourlyRate: string | null }
type Expense = { id: string; jobId: string; description: string; type: string; amount: string; date: Date; hours: string | null; ratePerHour: string | null }
type Job = { id: string; name: string; clientName: string }

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function TechnicianProfileClient({ technician, laborExpenses, jobs, locale }: {
  technician: Technician
  laborExpenses: Expense[]
  jobs: Job[]
  locale: string
}) {
  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]))

  const totalHours = laborExpenses.reduce((s, e) => s + parseFloat(e.hours ?? '0'), 0)
  const totalCost = laborExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const monthStart = startOfMonth()
  const monthExpenses = laborExpenses.filter(e => new Date(e.date) >= monthStart)
  const monthHours = monthExpenses.reduce((s, e) => s + parseFloat(e.hours ?? '0'), 0)
  const monthCost = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/team`} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{technician.name}</h1>
      </div>

      {/* Info card */}
      <div className="plumbr-card p-5 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-xl shrink-0">
              {technician.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={13} className="text-slate-400" /> {technician.email}
              </div>
              {technician.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={13} className="text-slate-400" /> {technician.phone}
                </div>
              )}
              {technician.hourlyRate && (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <DollarSign size={13} /> ${parseFloat(technician.hourlyRate).toFixed(0)}/hr base rate
                </div>
              )}
            </div>
          </div>
          <Link href={`/${locale}/team`} className="text-xs text-slate-400 hover:text-[#1E3A5F] transition-colors border border-slate-200 rounded-lg px-3 py-1.5">
            Edit in Team
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Hours this month', value: `${monthHours.toFixed(1)}h`, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Cost this month', value: `$${monthCost.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total hours', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'text-slate-600 bg-slate-100' },
          { label: 'Total labor cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-slate-600 bg-slate-100' },
        ].map(stat => (
          <div key={stat.label} className="plumbr-card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
              <stat.icon size={15} />
            </div>
            <p className="text-lg font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Labor history */}
      <div className="plumbr-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Labor history</h2>
        </div>
        {laborExpenses.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No labor entries yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {laborExpenses.map(exp => {
              const job = jobMap[exp.jobId]
              return (
                <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Briefcase size={13} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      {job ? (
                        <Link href={`/${locale}/jobs/${job.id}`} className="text-sm font-medium text-[#1E3A5F] hover:underline truncate block">
                          {job.name}
                        </Link>
                      ) : (
                        <p className="text-sm text-slate-500 truncate">Unknown job</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {parseFloat(exp.hours ?? '0').toFixed(1)} hrs
                        {exp.ratePerHour ? ` @ $${parseFloat(exp.ratePerHour).toFixed(0)}/hr` : ''}
                        {' · '}{new Date(exp.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-slate-800 shrink-0">${parseFloat(exp.amount).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
        {laborExpenses.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between text-sm font-semibold text-slate-700 bg-slate-50">
            <span>{totalHours.toFixed(1)} total hours</span>
            <span>${totalCost.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
