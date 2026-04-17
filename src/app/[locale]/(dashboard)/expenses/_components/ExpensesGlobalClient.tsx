'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createExpense } from '@/lib/actions/expenses'
import { Receipt, ChevronDown, X, Plus, Camera } from 'lucide-react'
import { KpiCard, Segmented } from '@/components/ui'

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
  labor: 'wp-type-chip wp-type-chip--labor',
  material: 'wp-type-chip wp-type-chip--material',
  subcontractor: 'wp-type-chip wp-type-chip--subcontractor',
  other: 'wp-type-chip wp-type-chip--other',
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

  // KPI totals from ALL expenses (unfiltered)
  const kpis = useMemo(() => {
    let total = 0, materials = 0, tools = 0, fuelOther = 0
    for (const e of initialExpenses) {
      const amt = parseFloat(e.amount)
      total += amt
      if (e.type === 'material') materials += amt
      else if (e.type === 'subcontractor') tools += amt // using subcontractor slot for tools
      else if (e.type === 'other') fuelOther += amt
      else fuelOther += 0 // labor goes into separate tracking
    }
    return { total, materials, tools, fuelOther, labor: total - materials - tools - fuelOther }
  }, [initialExpenses])

  // Group filtered by date for date grouping
  const dateGrouped = useMemo(() => {
    const groups: Record<string, Expense[]> = {}
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    for (const e of sorted) {
      const key = new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    }
    return groups
  }, [filtered])

  const SEGMENTED_OPTIONS = [
    { value: 'all', label: 'All', count: initialExpenses.length },
    { value: 'material', label: 'Materials' },
    { value: 'labor', label: 'Labor' },
    { value: 'subcontractor', label: 'Subs' },
    { value: 'other', label: 'Other' },
  ] as const

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
      <div className="hidden md:flex items-center justify-between mb-2">
        <div>
          <h1 className="page-title mb-0">Expenses</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--wp-text-muted)' }}>
            {initialExpenses.length} expenses · ${formatCurrencyCompact(kpis.total)} MTD
          </p>
        </div>
        <button onClick={() => setShowNewExpense(true)} className="btn-primary btn-sm">
          <Plus size={14} /> New Expense
        </button>
      </div>

      {/* KPI row */}
      <div className="hidden md:grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total spent" value={`$${formatCurrencyCompact(kpis.total)}`} sub="this month" tone="danger" />
        <KpiCard label="Materials" value={`$${formatCurrencyCompact(kpis.materials)}`} sub={`${kpis.total > 0 ? Math.round(kpis.materials / kpis.total * 100) : 0}%`} tone="info" />
        <KpiCard label="Labor" value={`$${formatCurrencyCompact(kpis.labor)}`} sub={`${kpis.total > 0 ? Math.round(kpis.labor / kpis.total * 100) : 0}%`} tone="warning" />
        <KpiCard label="Subs + Other" value={`$${formatCurrencyCompact(kpis.tools + kpis.fuelOther)}`} sub={`${kpis.total > 0 ? Math.round((kpis.tools + kpis.fuelOther) / kpis.total * 100) : 0}%`} tone="brand" />
      </div>

      {/* Mobile: tab-bar for types */}
      <div className="tab-bar mb-3 md:hidden">
        <button onClick={() => setTypeFilter('')} className={`tab-bar-item ${!typeFilter ? 'tab-bar-item-active' : ''}`}>All</button>
        <button onClick={() => setTypeFilter(typeFilter === 'labor' ? '' : 'labor')} className={`tab-bar-item ${typeFilter === 'labor' ? 'tab-bar-item-active' : ''}`}>Labor</button>
        <button onClick={() => setTypeFilter(typeFilter === 'material' ? '' : 'material')} className={`tab-bar-item ${typeFilter === 'material' ? 'tab-bar-item-active' : ''}`}>Material</button>
        <button onClick={() => setTypeFilter(typeFilter === 'subcontractor' ? '' : 'subcontractor')} className={`tab-bar-item ${typeFilter === 'subcontractor' ? 'tab-bar-item-active' : ''}`}>Sub</button>
      </div>

      {/* Desktop toolbar: segmented + secondary filters */}
      <div className="hidden md:block mb-5">
        <div className="flex items-center gap-4 flex-wrap">
          <Segmented
            options={SEGMENTED_OPTIONS}
            value={typeFilter || 'all'}
            onChange={(v: string) => setTypeFilter(v === 'all' ? '' : v)}
          />
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} className="input pr-8 appearance-none text-xs" style={{ minWidth: '140px' }}>
                <option value="">All jobs</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--wp-text-muted)' }} />
            </div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-xs" title="From date" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-xs" title="To date" />
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ color: 'var(--wp-text-muted)' }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

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

      {/* Desktop table — date grouped */}
      <div className="hidden md:block card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Receipt size={36} className="mx-auto mb-3" style={{ color: 'var(--wp-border)' }} />
            <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>{hasFilters ? 'No expenses match these filters.' : 'No expenses yet.'}</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[80px_1fr_1.5fr_100px_100px_50px_100px] gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ borderBottom: '1px solid var(--wp-border)', background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
              <span>Time</span>
              <span>Description</span>
              <span>Job</span>
              <span>Category</span>
              <span>Technician</span>
              <span className="text-center">Receipt</span>
              <span className="text-right">Amount</span>
            </div>
            {Object.entries(dateGrouped).map(([dateLabel, exps]) => {
              const dayTotal = exps.reduce((s, e) => s + parseFloat(e.amount), 0)
              return (
                <div key={dateLabel}>
                  {/* Date group header */}
                  <div className="flex items-baseline justify-between px-5 py-2" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-light)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--wp-text)' }}>{dateLabel}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${dayTotal.toFixed(2)}</span>
                  </div>
                  {exps.map(exp => {
                    const job = jobMap[exp.jobId]
                    const tech = exp.technicianId ? techMap[exp.technicianId] : null
                    const time = new Date(exp.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    return (
                      <div key={exp.id} className="grid grid-cols-[80px_1fr_1.5fr_100px_100px_50px_100px] gap-3 px-5 py-3 items-center transition-colors hover:bg-[var(--wp-surface-2)]" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                        <span className="text-xs tabular-nums" style={{ color: 'var(--wp-text-3)' }}>{time}</span>
                        <div className="min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--wp-text)' }}>{exp.description || TYPE_LABELS[exp.type]}</p>
                        </div>
                        <div className="min-w-0">
                          {job ? (
                            <Link href={`/${locale}/jobs/${job.id}`} className="text-sm hover:underline truncate block" style={{ color: 'var(--wp-brand)' }}>
                              {job.name}
                            </Link>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>—</span>
                          )}
                        </div>
                        <span className={TYPE_COLORS[exp.type] ?? TYPE_COLORS.other}>
                          {TYPE_LABELS[exp.type] ?? exp.type}
                        </span>
                        <span className="text-xs truncate" style={{ color: 'var(--wp-text-3)' }}>
                          {tech ? tech.name : '—'}
                        </span>
                        <span className="text-center">
                          <Camera size={14} style={{ color: 'var(--wp-text-3)', opacity: 0.4 }} className="mx-auto" />
                        </span>
                        <span className="font-semibold text-sm text-right tabular-nums" style={{ color: 'var(--wp-error-v2)' }}>
                          ${formatCurrency(exp.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: '1px solid var(--wp-border)', background: 'var(--wp-surface-2)' }}>
              <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--wp-text)' }}>
                Total: ${formatCurrency(totals.grand)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
