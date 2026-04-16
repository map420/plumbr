'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/lib/actions/expenses'
import { Receipt, ChevronDown, X, Plus } from 'lucide-react'

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
  other: 'bg-gray-100 text-gray-600',
}

export function ExpensesGlobalClient({
  initialExpenses, jobs, technicians,
}: {
  initialExpenses: Expense[]
  jobs: Job[]
  technicians: Technician[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
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

  // New Expense modal state
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [newExp, setNewExp] = useState({ jobId: '', description: '', type: 'material', amount: '', date: new Date().toISOString().split('T')[0] })

  function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!newExp.jobId || !newExp.amount) return
    startTransition(async () => {
      await createExpense(newExp.jobId, {
        description: newExp.description,
        type: newExp.type,
        amount: newExp.amount,
        date: newExp.date,
      })
      setShowNewExpense(false)
      setNewExp({ jobId: '', description: '', type: 'material', amount: '', date: new Date().toISOString().split('T')[0] })
      router.refresh()
    })
  }

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full max-w-5xl">
      {/* New Expense Modal */}
      {showNewExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNewExpense(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--wp-text-primary)' }}>New Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Job *</label>
                <select value={newExp.jobId} onChange={e => setNewExp(p => ({ ...p, jobId: e.target.value }))} required className="input w-full">
                  <option value="">Select a job...</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.name} — {j.clientName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Type</label>
                <select value={newExp.type} onChange={e => setNewExp(p => ({ ...p, type: e.target.value }))} className="input w-full">
                  {Object.entries(TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Description</label>
                <input type="text" value={newExp.description} onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))} className="input w-full" placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Amount *</label>
                  <input type="number" min="0" step="0.01" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} required className="input w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Date</label>
                  <input type="date" value={newExp.date} onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))} className="input w-full" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowNewExpense(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? 'Saving...' : 'Create Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop header */}
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Expenses</h1>
        <button onClick={() => setShowNewExpense(true)} className="btn-primary btn-sm">
          <Plus size={14} /> New Expense
        </button>
      </div>

      {/* Mobile: tab-bar for types */}
      <div className="tab-bar mb-3 md:hidden">
        <button onClick={() => setTypeFilter('')} className={`tab-bar-item ${!typeFilter ? 'tab-bar-item-active' : ''}`}>All</button>
        <button onClick={() => setTypeFilter(typeFilter === 'labor' ? '' : 'labor')} className={`tab-bar-item ${typeFilter === 'labor' ? 'tab-bar-item-active' : ''}`}>Labor</button>
        <button onClick={() => setTypeFilter(typeFilter === 'material' ? '' : 'material')} className={`tab-bar-item ${typeFilter === 'material' ? 'tab-bar-item-active' : ''}`}>Material</button>
        <button onClick={() => setTypeFilter(typeFilter === 'subcontractor' ? '' : 'subcontractor')} className={`tab-bar-item ${typeFilter === 'subcontractor' ? 'tab-bar-item-active' : ''}`}>Sub</button>
      </div>

      {/* Desktop filters */}
      <div className="hidden md:block card p-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="input pr-8 appearance-none"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              className="input pr-8 appearance-none"
            >
              <option value="">All jobs</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {technicians.length > 0 && (
            <div className="relative">
              <select
                value={techFilter}
                onChange={e => setTechFilter(e.target.value)}
                className="input pr-8 appearance-none"
              >
                <option value="">All technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="input"
            placeholder="From"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="input"
            placeholder="To"
            title="To date"
          />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-muted)' }}>
            <X size={12} /> Clear filters
          </button>
        )}
      </div> {/* end desktop filters */}

      {/* Summary by type */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {Object.entries(TYPE_LABELS).map(([type, label]) => {
            const amt = totals.byType[type] ?? 0
            return (
              <div key={type} className="card p-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type]}`}>{label}</span>
                <p className="text-lg font-bold mt-2" style={{ color: 'var(--wp-text-primary)' }}>${formatCurrencyCompact(amt)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile list — Joist style */}
      <div className={`md:hidden ${isPending ? 'opacity-50' : ''}`}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--wp-text-muted)', fontSize: '0.875rem' }}>No expenses yet.</div>
        ) : (() => {
          const monthGrouped = filtered.reduce<Record<string, Expense[]>>((acc, exp) => {
            const key = new Date(exp.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            if (!acc[key]) acc[key] = []
            acc[key].push(exp)
            return acc
          }, {})
          const mKeys = Object.keys(monthGrouped)
          return mKeys.map((month, mi) => {
            const items = monthGrouped[month]
            const monthTotal = items.reduce((s, e) => s + parseFloat(e.amount), 0)
            return (
              <div key={month}>
                <div className={`flex items-baseline justify-between px-3 py-2 -mx-4 ${mi > 0 ? 'mt-4' : ''}`}
                  style={{ background: 'var(--wp-bg-muted)', borderBottom: '1px solid var(--wp-border)' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--wp-text-primary)' }}>{month}</span>
                  <span className="text-price" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-primary)' }}>${monthTotal.toFixed(2)}</span>
                </div>
                {items.map((exp, idx) => {
                  const job = jobMap[exp.jobId]
                  return (
                    <div key={exp.id}
                      style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--wp-border-light)', animation: 'fadeSlideIn 0.3s ease both', animationDelay: `${idx * 30}ms` }}>
                      <div className="flex items-baseline justify-between">
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text-primary)' }}>{exp.description || TYPE_LABELS[exp.type]}</span>
                        <span className="text-price" style={{ fontSize: '0.9375rem', color: 'var(--wp-text-primary)' }}>${parseFloat(exp.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>
                          {job?.name || 'Unknown job'} · {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`badge badge-sm ${exp.type === 'labor' ? 'badge-sent' : exp.type === 'material' ? 'badge-on-hold' : exp.type === 'subcontractor' ? 'badge-converted' : 'badge-draft'}`}>
                          {TYPE_LABELS[exp.type]}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })
        })()}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Receipt size={36} className="mx-auto mb-3" style={{ color: 'var(--wp-border)' }} />
            <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>{hasFilters ? 'No expenses match these filters.' : 'No expenses yet.'}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_2fr_auto_auto] gap-3 px-5 py-2.5 text-xs font-medium uppercase tracking-wide" style={{ borderBottom: '1px solid var(--wp-border-light)', background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)' }}>
              <span>Job</span>
              <span>Type</span>
              <span>Detail</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
            </div>
            <div>
              {filtered.map(exp => {
                const job = jobMap[exp.jobId]
                const tech = exp.technicianId ? techMap[exp.technicianId] : null
                const isLabor = exp.type === 'labor'
                return (
                  <div key={exp.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2fr_auto_auto] gap-1 sm:gap-3 px-5 py-3 items-center transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                    <div className="min-w-0">
                      {job ? (
                        <Link href={`/${locale}/jobs/${job.id}`} className="text-sm font-medium hover:underline truncate block" style={{ color: 'var(--wp-primary)' }} onClick={e => e.stopPropagation()}>
                          {job.name}
                        </Link>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>Unknown job</span>
                      )}
                      {job && <span className="text-xs truncate block" style={{ color: 'var(--wp-text-muted)' }}>{job.clientName}</span>}
                    </div>
                    <div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[exp.type]}`}>
                        {TYPE_LABELS[exp.type] ?? exp.type}
                      </span>
                    </div>
                    <div className="min-w-0">
                      {isLabor && tech ? (
                        <>
                          <p className="text-sm truncate" style={{ color: 'var(--wp-text-secondary)' }}>{tech.name}</p>
                          <p className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>
                            {parseFloat(exp.hours ?? '0').toFixed(1)} hrs
                            {exp.ratePerHour ? ` @ $${parseFloat(exp.ratePerHour).toFixed(0)}/hr` : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm truncate" style={{ color: 'var(--wp-text-secondary)' }}>{exp.description}</p>
                      )}
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'var(--wp-text-muted)' }}>
                      {new Date(exp.date).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-sm text-right whitespace-nowrap" style={{ color: 'var(--wp-text-primary)' }}>
                      ${formatCurrency(exp.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--wp-border-light)', background: 'var(--wp-bg-muted)' }}>
              <span className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--wp-text-primary)' }}>
                Total: ${formatCurrency(totals.grand)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
