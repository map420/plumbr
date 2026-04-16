'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteJob } from '@/lib/actions/jobs'
import { createExpense, deleteExpense } from '@/lib/actions/expenses'
import { assignTechnicianToJob, removeTechnicianFromJob } from '@/lib/actions/technicians'
import { createChangeOrder, updateChangeOrder } from '@/lib/actions/change-orders'
import { createWorkOrder, generateWorkOrderFromEstimate, updateWorkOrder } from '@/lib/actions/work-orders'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Edit, Trash2, Plus, X, Camera, FileEdit, ClipboardList, ChevronDown, ChevronLeft, ShoppingCart, ChevronRight } from 'lucide-react'
import { PhotoUploader } from '@/components/PhotoUploader'
import { PhotoGallery } from '@/components/PhotoGallery'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

type Job = { id: string; clientId: string | null; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string; actualCost: string; startDate: Date | null; notes: string | null }
type Estimate = { id: string; number: string; status: string; total: string }
type Invoice = { id: string; number: string; status: string; total: string }
type Expense = { id: string; description: string; type: string; amount: string; date: Date; technicianId: string | null; hours: string | null; ratePerHour: string | null }
type Technician = { id: string; name: string; email: string; phone: string | null; hourlyRate: string | null }

type T = {
  edit: string; back: string; delete: string
  fields: Record<string, string>
  status: Record<JobStatus, string>
  estimates: string; invoices: string; newEstimate: string; newInvoice: string
  estimateStatus: Record<EstimateStatus, string>
  invoiceStatus: Record<InvoiceStatus, string>
}

const EXPENSE_TYPES = ['labor', 'material', 'subcontractor', 'other'] as const

type ShoppingListSummary = {
  id: string; name: string; status: string
  totalItems: number; purchasedItems: number; totalCost: number; purchasedCost: number
}

export function JobDetailClient({ job, estimates, invoices, expenses: initialExpenses, allTechnicians, assignedTechnicians: initialAssigned, photos, changeOrders, workOrders, shoppingLists = [], translations: t }: {
  job: Job; estimates: Estimate[]; invoices: Invoice[]; expenses: Expense[]
  allTechnicians: Technician[]; assignedTechnicians: Technician[]; translations: T
  photos: { id: string; url: string; description: string | null; thumbnailUrl: string | null }[]
  changeOrders: { id: string; number: string; description: string | null; status: string; total: string }[]
  workOrders: { id: string; number: string; title: string; status: string }[]
  shoppingLists?: ShoppingListSummary[]
}) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [assigned, setAssigned] = useState(initialAssigned)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ description: '', type: 'labor', amount: '', date: new Date().toISOString().split('T')[0], technicianId: '', hours: '', ratePerHour: '' })
  const [expenseFilter, setExpenseFilter] = useState<string>('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Change Orders state
  const [coList, setCoList] = useState(changeOrders)
  const [showCoForm, setShowCoForm] = useState(false)
  const [coDescription, setCoDescription] = useState('')
  const [coLineItems, setCoLineItems] = useState<{ description: string; amount: string }[]>([{ description: '', amount: '' }])
  const [coStatusMenuId, setCoStatusMenuId] = useState<string | null>(null)

  // Work Orders state
  const [woList, setWoList] = useState(workOrders)
  const [showWoForm, setShowWoForm] = useState(false)
  const [woTitle, setWoTitle] = useState('')
  const [woInstructions, setWoInstructions] = useState('')
  const [showWoConfirm, setShowWoConfirm] = useState(false)

  const coTotal = coLineItems.reduce((s, li) => s + (parseFloat(li.amount) || 0), 0)

  function handleAddCoLineItem() {
    setCoLineItems(prev => [...prev, { description: '', amount: '' }])
  }

  function handleRemoveCoLineItem(idx: number) {
    setCoLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  function handleCoLineItemChange(idx: number, field: 'description' | 'amount', value: string) {
    setCoLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li))
  }

  function handleCreateChangeOrder(e: React.FormEvent) {
    e.preventDefault()
    const validItems = coLineItems.filter(li => li.description.trim() && parseFloat(li.amount) > 0)
    if (validItems.length === 0) return
    startTransition(async () => {
      const items = validItems.map(li => ({
        type: 'labor' as const,
        description: li.description,
        quantity: 1,
        unitPrice: parseFloat(li.amount),
        total: parseFloat(li.amount),
      }))
      const total = items.reduce((s, i) => s + i.total, 0)
      const co = await createChangeOrder(
        { jobId: job.id, description: coDescription, subtotal: total, tax: 0, total },
        items
      )
      setCoList(prev => [...prev, co])
      setShowCoForm(false)
      setCoDescription('')
      setCoLineItems([{ description: '', amount: '' }])
    })
  }

  function handleCoStatusChange(coId: string, newStatus: string) {
    setCoStatusMenuId(null)
    startTransition(async () => {
      await updateChangeOrder(coId, { status: newStatus })
      setCoList(prev => prev.map(co => co.id === coId ? { ...co, status: newStatus } : co))
    })
  }

  function handleGenerateWorkOrder() {
    const firstEstimate = estimates[0]
    if (firstEstimate) {
      setShowWoConfirm(true)
    } else {
      setShowWoForm(true)
    }
  }

  function handleConfirmGenerateWo() {
    setShowWoConfirm(false)
    startTransition(async () => {
      const wo = await generateWorkOrderFromEstimate(job.id, estimates[0].id)
      setWoList(prev => [...prev, wo])
    })
  }

  function handleCreateWorkOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!woTitle.trim()) return
    startTransition(async () => {
      const wo = await createWorkOrder({
        jobId: job.id,
        title: woTitle,
        instructions: woInstructions || undefined,
      })
      setWoList(prev => [...prev, wo])
      setShowWoForm(false)
      setWoTitle('')
      setWoInstructions('')
    })
  }

  function handleWoStatusToggle(woId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'pending' ? 'in_progress' : currentStatus === 'in_progress' ? 'completed' : 'pending'
    startTransition(async () => {
      await updateWorkOrder(woId, { status: nextStatus })
      setWoList(prev => prev.map(wo => wo.id === woId ? { ...wo, status: nextStatus } : wo))
    })
  }

  const budget = parseFloat(job.budgetedCost ?? '0')
  const actualCost = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const margin = budget > 0 ? Math.round(((budget - actualCost) / budget) * 100) : null

  // Revenue from paid invoices for this job
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
  const revenueMargin = revenue > 0 ? Math.round(((revenue - actualCost) / revenue) * 100) : null

  function handleDelete() {
    startTransition(async () => {
      await deleteJob(job.id)
      router.push(`/${locale}/jobs`)
    })
  }

  function handleAssign(tech: Technician) {
    if (assigned.find(a => a.id === tech.id)) return
    startTransition(async () => {
      const result = await assignTechnicianToJob(job.id, tech.id)
      if (result.warning) {
        const proceed = confirm(`⚠️ Schedule conflict: ${result.warning}\n\nAssign anyway?`)
        if (!proceed) {
          await removeTechnicianFromJob(job.id, tech.id)
          return
        }
      }
      setAssigned(prev => [...prev, tech])
    })
  }

  function handleUnassign(techId: string) {
    startTransition(async () => {
      await removeTechnicianFromJob(job.id, techId)
      setAssigned(prev => prev.filter(a => a.id !== techId))
    })
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const created = await createExpense(job.id, expenseForm)
      setExpenses(prev => [created, ...prev])
      setShowExpenseForm(false)
      setExpenseForm({ description: '', type: 'labor', amount: '', date: new Date().toISOString().split('T')[0], technicianId: '', hours: '', ratePerHour: '' })
    })
  }

  function handleLaborTechChange(techId: string) {
    const tech = allTechnicians.find(t => t.id === techId)
    const rate = tech?.hourlyRate ?? ''
    const hrs = expenseForm.hours
    const total = rate && hrs ? (parseFloat(hrs) * parseFloat(rate)).toFixed(2) : ''
    setExpenseForm(f => ({ ...f, technicianId: techId, ratePerHour: rate, amount: total, description: tech ? `${tech.name} · labor` : f.description }))
  }

  function handleLaborFieldChange(field: 'hours' | 'ratePerHour', value: string) {
    setExpenseForm(f => {
      const hrs = field === 'hours' ? value : f.hours
      const rate = field === 'ratePerHour' ? value : f.ratePerHour
      const total = hrs && rate ? (parseFloat(hrs) * parseFloat(rate)).toFixed(2) : ''
      return { ...f, [field]: value, amount: total }
    })
  }

  function handleDeleteExpense(id: string) {
    startTransition(async () => {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    })
  }

  return (
    <div className="max-w-4xl">
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Job"
          message={`Are you sure you want to delete "${job.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Mobile header: < Jobs | Job Name | Edit */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button onClick={() => router.push(`/${locale}/jobs`)}
            className="flex items-center gap-0.5"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <ChevronLeft size={16} /> Jobs
          </button>
        </div>
        <span className="flex-shrink-0 truncate max-w-[180px]" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{job.name}</span>
        <div className="flex-1 flex items-center justify-end">
          <Link href={`/${locale}/jobs/${job.id}/edit`}
            className="flex items-center"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            Edit
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-8">
      <div className="hidden md:flex items-start justify-between mb-6">
        <div>
          <Breadcrumbs items={[{ label: 'Jobs', href: `/${locale}/jobs` }, { label: job.name }]} />
          <h1 className="text-2xl font-bold text-[var(--wp-text-primary)]">{job.name}</h1>
          <div className="mt-1"><JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} /></div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/jobs/${job.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit size={14} /> {t.edit}
          </Link>
          <button onClick={() => setShowDeleteModal(true)} disabled={isPending} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-[var(--wp-error)] text-[var(--wp-error)] hover:bg-[var(--wp-error-bg)] transition-colors disabled:opacity-50">
            <Trash2 size={14} /> {t.delete}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 card p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--wp-text-muted)]">Client</span>
              {job.clientId ? (
                <Link href={`/${locale}/clients/${job.clientId}`} className="font-medium mt-0.5 text-[var(--wp-primary)] hover:underline flex items-center gap-1">
                  {job.clientName}
                </Link>
              ) : (
                <p className="font-medium mt-0.5">{job.clientName}</p>
              )}
            </div>
            <div><span className="text-[var(--wp-text-muted)]">{t.fields.clientEmail}</span><p className="font-medium mt-0.5">{job.clientEmail || '—'}</p></div>
            <div><span className="text-[var(--wp-text-muted)]">{t.fields.clientPhone}</span><p className="font-medium mt-0.5">{job.clientPhone || '—'}</p></div>
            <div><span className="text-[var(--wp-text-muted)]">{t.fields.address}</span><p className="font-medium mt-0.5">{job.address || '—'}</p></div>
            <div><span className="text-[var(--wp-text-muted)]">{t.fields.startDate}</span><p className="font-medium mt-0.5">{job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}</p></div>
          </div>
          {job.notes && <div className="text-sm pt-2 border-t border-[var(--wp-border-light)]"><span className="text-[var(--wp-text-muted)]">{t.fields.notes}</span><p className="text-[var(--wp-text-primary)] mt-0.5 whitespace-pre-wrap">{job.notes}</p></div>}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-[var(--wp-text-primary)] mb-4">Job Costing</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Budget</span><span className="font-semibold">${budget.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Actual Cost</span><span className="font-semibold">${actualCost.toLocaleString()}</span></div>
            {revenue > 0 && <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Revenue</span><span className="font-semibold text-[var(--wp-success)]">${revenue.toLocaleString()}</span></div>}
            {budget > 0 && (
              <>
                <div>
                  <div className="flex justify-between text-xs text-[var(--wp-text-muted)] mb-1">
                    <span>Actual cost vs. budget</span>
                    <span>{Math.round(Math.min((actualCost / budget) * 100, 100))}%</span>
                  </div>
                  <div className="w-full bg-[var(--wp-bg-muted)] rounded-full h-2">
                    <div className={`h-2 rounded-full ${actualCost > budget ? 'bg-[var(--wp-error)]' : 'bg-[var(--wp-success)]'}`} style={{ width: `${Math.min((actualCost / budget) * 100, 100)}%` }} />
                  </div>
                </div>
                {margin !== null && <p className={`text-xs font-medium ${margin >= 0 ? 'text-[var(--wp-success)]' : 'text-[var(--wp-error)]'}`}>{margin}% budget margin</p>}
              </>
            )}
            {revenueMargin !== null && <p className={`text-xs font-medium ${revenueMargin >= 0 ? 'text-[var(--wp-success)]' : 'text-[var(--wp-error)]'}`}>{revenueMargin}% profit margin</p>}
          </div>
        </div>
      </div>

      {/* Technicians */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-[var(--wp-text-primary)] mb-3">Assigned Technicians</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {assigned.length === 0 && <p className="text-sm text-[var(--wp-text-muted)]">No technicians assigned.</p>}
          {assigned.map(tech => (
            <div key={tech.id} className="flex items-center gap-2 bg-[var(--wp-info-bg)] border border-[var(--wp-info)] rounded-lg px-3 py-1.5 text-sm">
              <div className="w-6 h-6 rounded-full bg-[var(--wp-primary)] text-white text-xs flex items-center justify-center font-bold">{tech.name.charAt(0)}</div>
              <span className="font-medium text-[var(--wp-text-primary)]">{tech.name}</span>
              <button onClick={() => handleUnassign(tech.id)} className="text-[var(--wp-text-muted)] hover:text-red-500 ml-1"><X size={13} /></button>
            </div>
          ))}
        </div>
        {allTechnicians.filter(t => !assigned.find(a => a.id === t.id)).length > 0 && (
          <select onChange={e => { const t = allTechnicians.find(t => t.id === e.target.value); if (t) handleAssign(t); e.target.value = '' }}
            className="input text-sm max-w-xs" defaultValue="">
            <option value="" disabled>+ Assign technician</option>
            {allTechnicians.filter(t => !assigned.find(a => a.id === t.id)).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Expenses */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--wp-text-primary)]">Expenses</h3>
          <button onClick={() => setShowExpenseForm(v => !v)} className="btn-primary text-xs flex items-center gap-1">
            <Plus size={13} /> Add Expense
          </button>
        </div>

        {showExpenseForm && (
          <form onSubmit={handleAddExpense} className="bg-[var(--wp-bg-secondary)] rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--wp-text-muted)]">Type</label>
                <select value={expenseForm.type} onChange={e => setExpenseForm(f => ({ ...f, type: e.target.value, technicianId: '', hours: '', ratePerHour: '', amount: '' }))} className="input mt-1 text-sm">
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--wp-text-muted)]">Date</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} className="input mt-1 text-sm" />
              </div>
            </div>

            {expenseForm.type === 'labor' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[var(--wp-text-muted)]">Technician *</label>
                  <select required value={expenseForm.technicianId} onChange={e => handleLaborTechChange(e.target.value)} className="input mt-1 text-sm">
                    <option value="">Select technician</option>
                    {assigned.length > 0 ? (
                      <>
                        <optgroup label="Assigned to this job">
                          {assigned.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </optgroup>
                        {allTechnicians.filter(t => !assigned.find(a => a.id === t.id)).length > 0 && (
                          <optgroup label="Other technicians">
                            {allTechnicians.filter(t => !assigned.find(a => a.id === t.id)).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      allTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--wp-text-muted)]">Hours *</label>
                  <input required type="number" min="0.25" step="0.25" value={expenseForm.hours} onChange={e => handleLaborFieldChange('hours', e.target.value)} className="input mt-1 text-sm" placeholder="4.5" />
                </div>
                <div>
                  <label className="text-xs text-[var(--wp-text-muted)]">Rate $/hr *</label>
                  <input required type="number" min="0" step="0.01" value={expenseForm.ratePerHour} onChange={e => handleLaborFieldChange('ratePerHour', e.target.value)} className="input mt-1 text-sm" placeholder="75.00" />
                </div>
                {expenseForm.amount && (
                  <div className="sm:col-span-3 flex items-center gap-2 text-sm font-semibold text-[var(--wp-text-primary)] bg-white rounded-lg px-3 py-2 border border-[var(--wp-border)]">
                    <span className="text-[var(--wp-text-muted)] font-normal">{expenseForm.hours}h × ${expenseForm.ratePerHour}/hr =</span>
                    <span className="text-[var(--wp-primary)]">${parseFloat(expenseForm.amount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--wp-text-muted)]">Description *</label>
                  <input required value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} className="input mt-1 text-sm" placeholder="Materials, tools..." />
                </div>
                <div>
                  <label className="text-xs text-[var(--wp-text-muted)]">Amount *</label>
                  <input required type="number" step="0.01" min="0" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} className="input mt-1 text-sm" placeholder="0.00" />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="btn-primary text-xs">{isPending ? 'Saving...' : 'Save'}</button>
              <button type="button" onClick={() => setShowExpenseForm(false)} className="btn-secondary text-xs">Cancel</button>
            </div>
          </form>
        )}

        {expenses.length > 0 && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(['all', ...EXPENSE_TYPES] as const).map(type => (
              <button key={type} onClick={() => setExpenseFilter(type)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${expenseFilter === type ? 'bg-[var(--wp-primary)] text-white' : 'bg-[var(--wp-bg-muted)] text-[var(--wp-text-muted)] hover:bg-[var(--wp-bg-muted)]'}`}>
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
        {expenses.length === 0 ? (
          <p className="text-sm text-[var(--wp-text-muted)]">No expenses recorded.</p>
        ) : (
          <div className="space-y-1">
            {expenses.filter(e => expenseFilter === 'all' || e.type === expenseFilter).map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-2 border-b border-[var(--wp-border-light)] last:border-0 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    exp.type === 'labor' ? 'bg-[var(--wp-info-bg)] text-[var(--wp-info)]' :
                    exp.type === 'material' ? 'bg-[var(--wp-warning-bg)] text-[var(--wp-warning)]' :
                    exp.type === 'subcontractor' ? 'bg-[#F5F3FF] text-[#7C3AED]' :
                    'bg-[var(--wp-bg-muted)] text-[var(--wp-text-secondary)]'
                  }`}>{exp.type}</span>
                  {exp.type === 'labor' && exp.hours && exp.ratePerHour ? (
                    <span className="text-[var(--wp-text-primary)] truncate">
                      {exp.description} · <span className="text-[var(--wp-text-muted)]">{parseFloat(exp.hours).toFixed(1)} hrs @ ${parseFloat(exp.ratePerHour).toFixed(0)}/hr</span>
                    </span>
                  ) : (
                    <span className="text-[var(--wp-text-primary)] truncate">{exp.description}</span>
                  )}
                  <span className="shrink-0 text-xs text-[var(--wp-text-muted)]">{new Date(exp.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold">${parseFloat(exp.amount).toLocaleString()}</span>
                  <button onClick={() => handleDeleteExpense(exp.id)} className="text-[var(--wp-text-muted)] hover:text-red-500 transition-colors"><X size={14} /></button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-semibold text-[var(--wp-text-primary)]">
              <span>Total</span>
              <span>${actualCost.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--wp-text-primary)]">{t.estimates}</h3>
          <Link href={`/${locale}/estimates/new?jobId=${job.id}`} className="btn-primary text-xs flex items-center gap-1"><Plus size={13} /> {t.newEstimate}</Link>
        </div>
        {estimates.length === 0 ? <p className="text-sm text-[var(--wp-text-muted)]">—</p> : (
          <div className="space-y-2">
            {estimates.map((e) => (
              <Link key={e.id} href={`/${locale}/estimates/${e.id}`} className="flex items-center justify-between py-2 border-b border-[var(--wp-border-light)] last:border-0 hover:bg-[var(--wp-bg-secondary)] -mx-1 px-1 rounded transition-colors">
                <span className="text-sm font-medium text-[var(--wp-primary)]">{e.number}</span>
                <div className="flex items-center gap-3">
                  <EstimateStatusBadge status={e.status as EstimateStatus} label={t.estimateStatus[e.status as EstimateStatus]} />
                  <span className="text-sm font-semibold">${parseFloat(e.total).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--wp-text-primary)]">{t.invoices}</h3>
          <Link href={`/${locale}/invoices/new?jobId=${job.id}`} className="btn-secondary text-xs flex items-center gap-1"><Plus size={13} /> {t.newInvoice}</Link>
        </div>
        {invoices.length === 0 ? <p className="text-sm text-[var(--wp-text-muted)]">—</p> : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/${locale}/invoices/${inv.id}`} className="flex items-center justify-between py-2 border-b border-[var(--wp-border-light)] last:border-0 hover:bg-[var(--wp-bg-secondary)] -mx-1 px-1 rounded transition-colors">
                <span className="text-sm font-medium text-[var(--wp-primary)]">{inv.number}</span>
                <div className="flex items-center gap-3">
                  <InvoiceStatusBadge status={inv.status as InvoiceStatus} label={t.invoiceStatus[inv.status as InvoiceStatus]} />
                  <span className="text-sm font-semibold">${parseFloat(inv.total).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Materials / Shopping Lists */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2"><ShoppingCart size={16} /> Materials</h3>
          <Link
            href={`/${locale}/shopping-list`}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <Plus size={13} /> New List
          </Link>
        </div>
        {shoppingLists.length === 0 ? (
          <p className="text-sm text-[var(--wp-text-muted)]">
            No shopping lists for this job yet. Generate one from an estimate's materials, or create one manually.
          </p>
        ) : (
          <div className="space-y-2">
            {shoppingLists.map(list => {
              const pct = list.totalItems > 0 ? Math.round((list.purchasedItems / list.totalItems) * 100) : 0
              const overBudget = list.purchasedCost > list.totalCost && list.totalCost > 0
              return (
                <Link
                  key={list.id}
                  href={`/${locale}/shopping-list/${list.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--wp-bg-secondary)] transition-colors"
                  style={{ border: '1px solid var(--wp-border-light)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{list.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--wp-text-muted)' }}>
                      {list.purchasedItems}/{list.totalItems} items · ${list.purchasedCost.toLocaleString()} of ${list.totalCost.toLocaleString()}
                    </p>
                    <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          background: overBudget ? 'var(--wp-error)' : pct === 100 ? 'var(--wp-success)' : 'var(--wp-primary)',
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--wp-border)' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2"><Camera size={16} /> Photos</h3>
          <PhotoUploader jobId={job.id} onUploaded={() => router.refresh()} />
        </div>
        <PhotoGallery photos={photos} canDelete />
        {photos.length === 0 && <p className="text-sm text-[var(--wp-text-muted)]">No photos yet.</p>}
      </div>

      {/* Change Orders */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2"><FileEdit size={16} /> Change Orders</h3>
          <button onClick={() => setShowCoForm(v => !v)} className="btn-primary text-xs flex items-center gap-1">
            <Plus size={13} /> New Change Order
          </button>
        </div>

        {showCoForm && (
          <form onSubmit={handleCreateChangeOrder} className="bg-[var(--wp-bg-secondary)] rounded-lg p-4 mb-4 space-y-3">
            <div>
              <label className="text-xs text-[var(--wp-text-muted)]">Description</label>
              <textarea value={coDescription} onChange={e => setCoDescription(e.target.value)}
                className="input mt-1 text-sm" rows={2} placeholder="Describe the change..." />
            </div>

            <div>
              <label className="text-xs text-[var(--wp-text-muted)] mb-1 block">Line Items</label>
              <div className="space-y-2">
                {coLineItems.map((li, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input value={li.description} onChange={e => handleCoLineItemChange(idx, 'description', e.target.value)}
                      className="input text-sm flex-1" placeholder="Item description" required />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)] text-sm">$</span>
                      <input type="number" step="0.01" min="0" value={li.amount} onChange={e => handleCoLineItemChange(idx, 'amount', e.target.value)}
                        className="input text-sm w-28 pl-6" placeholder="0.00" required />
                    </div>
                    {coLineItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveCoLineItem(idx)} className="text-[var(--wp-text-muted)] hover:text-red-500 mt-2"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddCoLineItem} className="text-xs text-[var(--wp-primary)] hover:text-[var(--wp-accent)] font-medium mt-2 flex items-center gap-1">
                <Plus size={12} /> Add Line Item
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--wp-border)]">
              <span className="text-sm font-semibold text-[var(--wp-text-primary)]">Total: <span className="text-[var(--wp-primary)]">${coTotal.toFixed(2)}</span></span>
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="btn-primary text-xs">{isPending ? 'Creating...' : 'Create Change Order'}</button>
                <button type="button" onClick={() => { setShowCoForm(false); setCoLineItems([{ description: '', amount: '' }]); setCoDescription('') }} className="btn-secondary text-xs">Cancel</button>
              </div>
            </div>
          </form>
        )}

        {coList.length === 0 ? (
          <p className="text-sm text-[var(--wp-text-muted)]">No change orders yet.</p>
        ) : (
          <div className="space-y-2">
            {coList.map(co => (
              <div key={co.id} className="flex items-center justify-between py-2 border-b border-[var(--wp-border-light)] last:border-0">
                <div>
                  <span className="text-sm font-medium text-[var(--wp-text-primary)]">{co.number}</span>
                  <span className="text-xs text-[var(--wp-text-muted)] ml-2">{co.description?.slice(0, 50) || 'No description'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button onClick={() => setCoStatusMenuId(coStatusMenuId === co.id ? null : co.id)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer flex items-center gap-1 transition-colors ${
                        co.status === 'approved' ? 'bg-[var(--wp-success-bg)] text-[var(--wp-success)] hover:bg-[var(--wp-success-bg)]' :
                        co.status === 'sent' ? 'bg-[var(--wp-info-bg)] text-[var(--wp-info)] hover:bg-[var(--wp-info-bg)]' :
                        co.status === 'rejected' ? 'bg-[var(--wp-error-bg)] text-[var(--wp-error)] hover:bg-[var(--wp-error-bg)]' :
                        'bg-[var(--wp-bg-muted)] text-[var(--wp-text-secondary)] hover:bg-[var(--wp-bg-muted)]'
                      }`}>
                      {co.status} <ChevronDown size={10} />
                    </button>
                    {coStatusMenuId === co.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border border-[var(--wp-border)] rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                        {(['draft', 'sent', 'approved', 'rejected'] as const).filter(s => s !== co.status).map(status => (
                          <button key={status} onClick={() => handleCoStatusChange(co.id, status)}
                            className={`w-full text-left text-xs px-3 py-1.5 hover:bg-[var(--wp-bg-secondary)] capitalize ${
                              status === 'approved' ? 'text-[var(--wp-success)]' :
                              status === 'sent' ? 'text-[var(--wp-info)]' :
                              status === 'rejected' ? 'text-[var(--wp-error)]' :
                              'text-[var(--wp-text-secondary)]'
                            }`}>
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-[var(--wp-text-primary)]">${parseFloat(co.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Work Orders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2"><ClipboardList size={16} /> Work Orders</h3>
          <button onClick={handleGenerateWorkOrder} className="btn-primary text-xs flex items-center gap-1">
            <Plus size={13} /> {estimates.length > 0 ? 'Generate Work Order' : 'New Work Order'}
          </button>
        </div>

        {showWoConfirm && (
          <div className="bg-[var(--wp-info-bg)] border border-[var(--wp-info)] rounded-lg p-4 mb-4">
            <p className="text-sm text-[var(--wp-text-primary)] mb-3">Generate work order from estimate <span className="font-semibold">{estimates[0]?.number}</span>? This creates crew instructions without pricing.</p>
            <div className="flex gap-2">
              <button onClick={handleConfirmGenerateWo} disabled={isPending} className="btn-primary text-xs">{isPending ? 'Generating...' : 'Yes, Generate'}</button>
              <button onClick={() => { setShowWoConfirm(false); setShowWoForm(true) }} className="btn-secondary text-xs">No, Create Manually</button>
              <button onClick={() => setShowWoConfirm(false)} className="text-xs text-[var(--wp-text-muted)] hover:text-[var(--wp-text-secondary)]">Cancel</button>
            </div>
          </div>
        )}

        {showWoForm && (
          <form onSubmit={handleCreateWorkOrder} className="bg-[var(--wp-bg-secondary)] rounded-lg p-4 mb-4 space-y-3">
            <div>
              <label className="text-xs text-[var(--wp-text-muted)]">Title *</label>
              <input required value={woTitle} onChange={e => setWoTitle(e.target.value)}
                className="input mt-1 text-sm" placeholder="Work order title..." />
            </div>
            <div>
              <label className="text-xs text-[var(--wp-text-muted)]">Instructions</label>
              <textarea value={woInstructions} onChange={e => setWoInstructions(e.target.value)}
                className="input mt-1 text-sm" rows={3} placeholder="Crew instructions, scope of work..." />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isPending} className="btn-primary text-xs">{isPending ? 'Creating...' : 'Create Work Order'}</button>
              <button type="button" onClick={() => { setShowWoForm(false); setWoTitle(''); setWoInstructions('') }} className="btn-secondary text-xs">Cancel</button>
            </div>
          </form>
        )}

        {woList.length === 0 ? (
          <p className="text-sm text-[var(--wp-text-muted)]">No work orders yet.</p>
        ) : (
          <div className="space-y-2">
            {woList.map(wo => (
              <div key={wo.id} className="flex items-center justify-between py-2 border-b border-[var(--wp-border-light)] last:border-0">
                <div>
                  <span className="text-sm font-medium text-[var(--wp-text-primary)]">{wo.number}</span>
                  <span className="text-xs text-[var(--wp-text-muted)] ml-2">{wo.title}</span>
                </div>
                <button onClick={() => handleWoStatusToggle(wo.id, wo.status)} disabled={isPending}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                    wo.status === 'completed' ? 'bg-[var(--wp-success-bg)] text-[var(--wp-success)] hover:bg-[var(--wp-success-bg)]' :
                    wo.status === 'in_progress' ? 'bg-[var(--wp-info-bg)] text-[var(--wp-info)] hover:bg-[var(--wp-info-bg)]' :
                    'bg-[var(--wp-bg-muted)] text-[var(--wp-text-secondary)] hover:bg-[var(--wp-bg-muted)]'
                  }`}>
                  {wo.status === 'in_progress' ? 'in progress' : wo.status} →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
