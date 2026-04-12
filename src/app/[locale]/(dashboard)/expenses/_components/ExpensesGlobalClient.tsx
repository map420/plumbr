'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Receipt, ChevronDown, X } from 'lucide-react'

type Expense = {
  id: string; jobId: string; description: string; type: string; amount: string
  technicianId: string | null; hours: string | null; ratePerHour: string | null; date: Date
}
type Job = { id: string; name: string; clientName: string }
type Technician = { id: string; name: string }

const TYPE_LABELS: Record<string, string> = {
  labor: 'Labor',
  material: 'Material',
  subcontractor: 'Subcontractor',
  other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  labor: 'bg-blue-50 text-blue-700',
  material: 'bg-amber-50 text-amber-700',
  subcontractor: 'bg-purple-50 text-purple-700',
  other: 'bg-slate-100 text-slate-600',
}

export function ExpensesGlobalClient({
  initialExpenses, jobs, technicians,
}: {
  initialExpenses: Expense[]
  jobs: Job[]
  technicians: Technician[]
}) {
  const locale = useLocale()
  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [j.id, j])), [jobs])
  const techMap = useMemo(() => Object.fromEntries(technicians.map(t => [t.id, t])), [technicians])

  const [typeFilter, setTypeFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [techFilter, setTechFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return initialExpenses.filter(e => {
      if (typeFilter && e.type !== typeFilter) return false
      if (jobFilter && e.jobId !== jobFilter) return false
      if (techFilter && e.technicianId !== techFilter) return false
      if (dateFrom && new Date(e.date) < new Date(dateFrom)) return false
      if (dateTo && new Date(e.date) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [initialExpenses, typeFilter, jobFilter, techFilter, dateFrom, dateTo])

  const totals = useMemo(() => {
    const byType: Record<string, number> = {}
    let grand = 0
    for (const e of filtered) {
      byType[e.type] = (byType[e.type] ?? 0) + parseFloat(e.amount)
      grand += parseFloat(e.amount)
    }
    return { byType, grand }
  }, [filtered])

  const hasFilters = typeFilter || jobFilter || techFilter || dateFrom || dateTo
  function clearFilters() {
    setTypeFilter(''); setJobFilter(''); setTechFilter(''); setDateFrom(''); setDateTo('')
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <span className="text-sm text-slate-500">{filtered.length} entries</span>
      </div>

      {/* Filters */}
      <div className="plumbr-card p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="plumbr-input pr-8 appearance-none"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="plumbr-input pr-8 appearance-none"
            >
              <option value="">All jobs</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {technicians.length > 0 && (
            <div className="relative">
              <select
                value={techFilter}
                onChange={e => setTechFilter(e.target.value)}
                className="plumbr-input pr-8 appearance-none"
              >
                <option value="">All technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="plumbr-input"
            placeholder="From"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="plumbr-input"
            placeholder="To"
            title="To date"
          />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Summary by type */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const amt = totals.byType[type] ?? 0
            return (
              <div key={type} className="plumbr-card p-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>{label}</span>
                <p className="text-lg font-bold text-slate-800 mt-2">${amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="plumbr-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Receipt size={36} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">{hasFilters ? 'No expenses match these filters.' : 'No expenses yet.'}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_2fr_auto_auto] gap-3 px-5 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-400 uppercase tracking-wide">
              <span>Job</span>
              <span>Type</span>
              <span>Detail</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.map(exp => {
                const job = jobMap[exp.jobId]
                const tech = exp.technicianId ? techMap[exp.technicianId] : null
                const isLabor = exp.type === 'labor'
                return (
                  <div key={exp.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto_auto] gap-1 sm:gap-3 px-5 py-3 items-center hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      {job ? (
                        <Link href={`/${locale}/jobs/${job.id}`} className="text-sm font-medium text-[#1E3A5F] hover:underline truncate block" onClick={e => e.stopPropagation()}>
                          {job.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-400">Unknown job</span>
                      )}
                      {job && <span className="text-xs text-slate-400 truncate block">{job.clientName}</span>}
                    </div>
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[exp.type]}`}>
                        {TYPE_LABELS[exp.type] ?? exp.type}
                      </span>
                    </div>
                    <div className="min-w-0">
                      {isLabor && tech ? (
                        <>
                          <p className="text-sm text-slate-700 truncate">{tech.name}</p>
                          <p className="text-xs text-slate-400">
                            {parseFloat(exp.hours ?? '0').toFixed(1)} hrs
                            {exp.ratePerHour ? ` @ $${parseFloat(exp.ratePerHour).toFixed(0)}/hr` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-700 truncate">{exp.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-sm text-slate-800 text-right whitespace-nowrap">
                      ${parseFloat(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-sm text-slate-500">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
              <span className="text-sm font-bold text-slate-800">
                Total: ${totals.grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
