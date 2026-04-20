'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatCurrencyCompact } from '@/lib/format'
import { deleteJob } from '@/lib/actions/jobs'
import { createExpense, deleteExpense } from '@/lib/actions/expenses'
import { assignTechnicianToJob, removeTechnicianFromJob } from '@/lib/actions/technicians'
import { createChangeOrder, updateChangeOrder } from '@/lib/actions/change-orders'
import { createWorkOrder, generateWorkOrderFromEstimate, updateWorkOrder } from '@/lib/actions/work-orders'
import { toggleJobChecklistItem } from '@/lib/actions/job-checklists'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Modal } from '@/components/Modal'
import { Segmented } from '@/components/ui'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Toast } from '@/components/Toast'
import { Edit, Trash2, Plus, X, Camera, FileEdit, ClipboardList, ChevronDown, ChevronLeft, ShoppingCart, ChevronRight } from 'lucide-react'
import { PhotoUploader } from '@/components/PhotoUploader'
import { PhotoGallery } from '@/components/PhotoGallery'
import { ClientAvatar, StatusPill, type StatusTone } from '@/components/ui'
import { deriveJobStatus } from '@/lib/status/derived'

const JOB_STATUS_TONE: Record<string, StatusTone> = {
  lead: 'neutral',
  active: 'active',
  on_hold: 'warning',
  completed: 'done',
  cancelled: 'declined',
}

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

type Job = { id: string; clientId: string | null; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string; actualCost: string; startDate: Date | null; endDate: Date | null; notes: string | null }
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

export type ChecklistItem = { id: string; label: string; completed: boolean; sortOrder: number | null; completedAt: Date | null }

import type { ActiveClockSession } from '@/lib/actions/clock'

export function JobDetailClient({ job, estimates, invoices, expenses: initialExpenses, allTechnicians, assignedTechnicians: initialAssigned, photos, changeOrders, workOrders, shoppingLists = [], checklistItems: initialChecklist = [], activeSession = null, translations: t }: {
  job: Job; estimates: Estimate[]; invoices: Invoice[]; expenses: Expense[]
  allTechnicians: Technician[]; assignedTechnicians: Technician[]; translations: T
  photos: { id: string; url: string; description: string | null; thumbnailUrl: string | null }[]
  changeOrders: { id: string; number: string; description: string | null; status: string; total: string }[]
  workOrders: { id: string; number: string; title: string; status: string }[]
  shoppingLists?: ShoppingListSummary[]
  checklistItems?: ChecklistItem[]
  activeSession?: ActiveClockSession | null
}) {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()

  // LEFT column tabs — URL-persisted (?tab=overview|financials|field)
  type LeftTab = 'overview' | 'financials' | 'field'
  const urlTab = (searchParams.get('tab') as LeftTab | null)
  const validTabs: LeftTab[] = ['overview', 'financials', 'field']
  const [leftTab, setLeftTab] = useState<LeftTab>(urlTab && validTabs.includes(urlTab) ? urlTab : 'overview')
  function changeTab(next: LeftTab) {
    setLeftTab(next)
    const p = new URLSearchParams(Array.from(searchParams.entries()))
    if (next === 'overview') p.delete('tab')
    else p.set('tab', next)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' } | null>(null)
  const notify = (message: string, variant: 'success' | 'error' | 'warning' = 'success') => setToast({ message, variant })

  const [expenses, setExpenses] = useState(initialExpenses)
  // Sync con SSR después de router.refresh(): useState inicializa solo una vez, así que
  // sin este effect los optimistic updates quedan stale tras stopClock/create/delete.
  useEffect(() => { setExpenses(initialExpenses) }, [initialExpenses])
  const [assigned, setAssigned] = useState(initialAssigned)
  useEffect(() => { setAssigned(initialAssigned) }, [initialAssigned])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ description: '', type: 'labor', amount: '', date: new Date().toISOString().split('T')[0], technicianId: '', hours: '', ratePerHour: '' })
  const [expenseFilter, setExpenseFilter] = useState<string>('all')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Change Orders state
  const [coList, setCoList] = useState(changeOrders)
  useEffect(() => { setCoList(changeOrders) }, [changeOrders])
  const [showCoForm, setShowCoForm] = useState(false)
  const [coDescription, setCoDescription] = useState('')
  const [coLineItems, setCoLineItems] = useState<{ description: string; amount: string }[]>([{ description: '', amount: '' }])
  const [coStatusMenuId, setCoStatusMenuId] = useState<string | null>(null)

  // Checklist state
  const [checklist, setChecklist] = useState(initialChecklist)
  useEffect(() => { setChecklist(initialChecklist) }, [initialChecklist])
  function handleToggleChecklistItem(item: ChecklistItem) {
    const next = !item.completed
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed: next, completedAt: next ? new Date() : null } : c))
    startTransition(async () => {
      try { await toggleJobChecklistItem(item.id, next) }
      catch { setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed: !next } : c)) }
    })
  }

  // Work Orders state
  const [woList, setWoList] = useState(workOrders)
  useEffect(() => { setWoList(workOrders) }, [workOrders])
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
      notify(locale === 'es' ? 'Change order creada' : 'Change order created')
    })
  }

  function handleCoStatusChange(coId: string, newStatus: string) {
    setCoStatusMenuId(null)
    startTransition(async () => {
      await updateChangeOrder(coId, { status: newStatus })
      setCoList(prev => prev.map(co => co.id === coId ? { ...co, status: newStatus } : co))
      notify(locale === 'es' ? `Change order: ${newStatus}` : `Change order ${newStatus}`)
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
      notify(locale === 'es' ? 'Work order generada' : 'Work order generated')
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
      notify(locale === 'es' ? 'Work order creada' : 'Work order created')
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
  // CLI-008 — actualCost incluye expenses + change orders aprobados
  const approvedCoTotal = coList.filter(c => c.status === 'approved').reduce((s, c) => s + parseFloat(c.total), 0)
  // A5 — sólo expenses con fecha <= hoy cuentan como "gasto real". Un expense programado
  // a futuro es una proyección, no un egreso ejecutado → no debe inflar actualCost ni disparar over-budget.
  const todayMs = Date.now()
  const actualExpensesTotal = expenses
    .filter(e => !e.date || new Date(e.date).getTime() <= todayMs)
    .reduce((s, e) => s + parseFloat(e.amount), 0)
  const actualCost = actualExpensesTotal + approvedCoTotal
  const margin = budget > 0 ? Math.round(((budget - actualCost) / budget) * 100) : null
  const isOverBudget = budget > 0 && actualCost > budget
  const overBudgetDelta = isOverBudget ? actualCost - budget : 0

  // Revenue from paid invoices for this job
  const revenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
  const revenueMargin = revenue > 0 ? Math.round(((revenue - actualCost) / revenue) * 100) : null

  function handleDelete() {
    startTransition(async () => {
      await deleteJob(job.id)
      router.push(`/${locale}/projects`)
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
      notify(locale === 'es' ? `${tech.name} asignado` : `${tech.name} assigned`)
    })
  }

  function handleUnassign(techId: string) {
    startTransition(async () => {
      const tech = assigned.find(a => a.id === techId)
      await removeTechnicianFromJob(job.id, techId)
      setAssigned(prev => prev.filter(a => a.id !== techId))
      notify(locale === 'es' ? `${tech?.name ?? 'Técnico'} retirado` : `${tech?.name ?? 'Technician'} removed`)
    })
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const created = await createExpense(job.id, expenseForm)
      setExpenses(prev => [created, ...prev])
      setShowExpenseForm(false)
      setExpenseForm({ description: '', type: 'labor', amount: '', date: new Date().toISOString().split('T')[0], technicianId: '', hours: '', ratePerHour: '' })
      notify(locale === 'es' ? 'Expense creado' : 'Expense created')
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
      notify(locale === 'es' ? 'Expense eliminado' : 'Expense deleted')
    })
  }

  return (
    <div className="w-full">
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDone={() => setToast(null)} />
      )}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${job.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Mobile header: < Jobs | Job Name | Edit */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button onClick={() => router.push(`/${locale}/projects`)}
            className="flex items-center gap-0.5"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <ChevronLeft size={16} /> Jobs
          </button>
        </div>
        <span className="flex-shrink-0 truncate max-w-[180px]" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{job.name}</span>
        <div className="flex-1 flex items-center justify-end">
          <Link href={`/${locale}/projects/${job.id}/edit`}
            className="flex items-center"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            Edit
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-8">
      <div className="hidden md:block mb-4">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Jobs', href: `/${locale}/projects` }, { label: job.name }]} />
        </div>
        {/* Hero — matching proposal layout */}
        <div className="card p-5" style={{ boxShadow: 'var(--wp-elevation-1)' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--wp-text)', letterSpacing: '-0.02em' }}>{job.name}</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--wp-text-3)' }}>
                JOB-{job.id.slice(0, 4)}
                {job.startDate && (() => {
                  const start = new Date(job.startDate)
                  const now = new Date()
                  const started = start <= now
                  const label = started
                    ? (locale === 'es' ? 'Iniciado' : 'Started')
                    : (locale === 'es' ? 'Comienza' : 'Starts')
                  const dateFmt = new Date(start).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' })
                  return <> · {label} {dateFmt}</>
                })()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {job.status === 'active' && (
                <button className="btn-primary btn-sm">
                  ✓ {locale === 'es' ? 'Marcar completado' : 'Mark completed'}
                </button>
              )}
              <Link href={`/${locale}/field/${job.id}`} className="btn-secondary btn-sm">
                Field mode
              </Link>
              <button onClick={() => setShowDeleteModal(true)} disabled={isPending}
                className="btn-ghost btn-sm" style={{ minHeight: 'auto', color: 'var(--wp-text-3)' }}>
                ···
              </button>
            </div>
          </div>
          {/* Meta row — labeled columns */}
          <div className="flex items-end gap-6 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--wp-text-3)' }}>Status</div>
              {(() => {
                const derived = deriveJobStatus(job)
                const label = derived === 'scheduled' ? (locale === 'es' ? 'Agendado' : 'Scheduled') : (t.status[derived as JobStatus] ?? derived)
                const tone = derived === 'scheduled' ? 'info' : (JOB_STATUS_TONE[derived] ?? 'neutral')
                return <StatusPill tone={tone as StatusTone}>{label}</StatusPill>
              })()}
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--wp-text-3)' }}>Client</div>
              {job.clientId ? (
                <Link href={`/${locale}/clients/${job.clientId}`} className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
                  {job.clientName}
                </Link>
              ) : (
                <span className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{job.clientName}</span>
              )}
            </div>
            {job.address && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--wp-text-3)' }}>{locale === 'es' ? 'Dirección' : 'Address'}</div>
                <span className="text-sm" style={{ color: 'var(--wp-text-2)' }}>{job.address}</span>
              </div>
            )}
            {parseFloat(job.budgetedCost) > 0 && (
              <div className="ml-auto text-right">
                <div className="flex items-center justify-end gap-1.5 mb-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Budgeted</div>
                  {isOverBudget && (
                    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-error-bg-v2)', color: 'var(--wp-error-v2)' }}>
                      Over budget +${overBudgetDelta.toFixed(0)}
                    </span>
                  )}
                </div>
                <span className="text-xl font-bold tabular-nums" style={{ color: 'var(--wp-text)' }}>
                  ${formatCurrencyCompact(parseFloat(job.budgetedCost))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-column layout: content (LEFT) + sidebar (RIGHT) spanning full detail */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 items-start">
        {/* ═══ LEFT COLUMN — tabs: Overview · Financials · Field ═══ */}
        <div className="space-y-4 min-w-0">
          <Segmented
            value={leftTab}
            onChange={changeTab}
            options={[
              { value: 'overview' as LeftTab, label: locale === 'es' ? 'Resumen' : 'Overview' },
              { value: 'financials' as LeftTab, label: locale === 'es' ? 'Finanzas' : 'Financials', count: estimates.length + invoices.length + expenses.length },
              { value: 'field' as LeftTab, label: locale === 'es' ? 'Campo' : 'Field', count: shoppingLists.length + photos.length },
            ]}
          />

          {/* Overview tab — notes, checklist, technicians */}
          {leftTab === 'overview' && job.notes && (
            <div className="card p-5 text-sm">
              <span className="text-[var(--wp-text-muted)]">{t.fields.notes}</span>
              <p className="text-[var(--wp-text-primary)] mt-0.5 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}

          {/* Checklist (if exists) */}
          {leftTab === 'overview' && checklist.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--wp-text-primary)]">
                  {locale === 'es' ? 'Checklist' : 'Checklist'}
                </h3>
                <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
                  {checklist.filter(c => c.completed).length}/{checklist.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {checklist.map(item => (
                  <label key={item.id} className="flex items-start gap-2.5 cursor-pointer py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item)}
                      className="mt-0.5"
                    />
                    <span style={{ color: item.completed ? 'var(--wp-text-3)' : 'var(--wp-text)', textDecoration: item.completed ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Technicians */}
          {leftTab === 'overview' && (
          <div className="card p-5">
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
          )}

          {/* Expenses — Financials tab */}
          {leftTab === 'financials' && (
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
                        <optgroup label="Assigned to this project">
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
                  <div className="sm:col-span-3 flex items-center gap-2 text-sm font-semibold text-[var(--wp-text-primary)] bg-card rounded-lg px-3 py-2 border border-[var(--wp-border)]">
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
                  <span className="shrink-0 text-xs text-[var(--wp-text-muted)]">{new Date(exp.date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold">${formatCurrency(exp.amount)}</span>
                  <button onClick={() => handleDeleteExpense(exp.id)} className="text-[var(--wp-text-muted)] hover:text-red-500 transition-colors"><X size={14} /></button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-semibold text-[var(--wp-text-primary)]">
              <span>Total</span>
              <span>${formatCurrency(actualCost)}</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Estimates — Financials tab */}
      {leftTab === 'financials' && (
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
                  <span className="text-sm font-semibold">${formatCurrency(e.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Invoices — Financials tab */}
      {leftTab === 'financials' && (
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
                  <span className="text-sm font-semibold">${formatCurrency(inv.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Materials / Shopping Lists — Field tab */}
      {leftTab === 'field' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2">
                <ShoppingCart size={16} /> Materials {shoppingLists.length > 0 && <span className="text-xs font-normal" style={{ color: 'var(--wp-text-3)' }}>· {shoppingLists.length} list{shoppingLists.length === 1 ? '' : 's'}</span>}
              </h3>
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
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--wp-bg-secondary)] transition-colors"
                      style={{ border: '1px solid var(--wp-border-light)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{list.name}</p>
                          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--wp-text-3)' }}>{list.purchasedItems}/{list.totalItems} items</span>
                        </div>
                        <p className="text-[11px] mb-1.5 tabular-nums" style={{ color: 'var(--wp-text-muted)' }}>
                          ${formatCurrency(list.purchasedCost)} of ${formatCurrency(list.totalCost)}
                          {overBudget && <span className="ml-1 font-semibold" style={{ color: 'var(--wp-error-v2)' }}>· over</span>}
                        </p>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--wp-surface-2)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: overBudget ? 'var(--wp-error-v2)' : pct === 100 ? 'var(--wp-success-v2)' : 'var(--wp-brand)',
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
          )}

          {/* Photos — Field tab */}
          {leftTab === 'field' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--wp-text-primary)] flex items-center gap-2"><Camera size={16} /> Photos</h3>
              <PhotoUploader jobId={job.id} onUploaded={() => router.refresh()} />
            </div>
            <PhotoGallery photos={photos} canDelete />
            {photos.length === 0 && <p className="text-sm text-[var(--wp-text-muted)]">No photos yet.</p>}
          </div>
          )}
        </div>{/* ═══ end LEFT column ═══ */}

        {/* ═══ RIGHT COLUMN: clock-in · job costing · schedule · client · change orders · work orders ═══ */}
        <div className="space-y-4 md:sticky md:top-4">
          {/* Clock-in */}
          {(job.status === 'active') && (
            <ClockInCard jobId={job.id} assignedTechnicians={assigned} activeSession={activeSession} locale={locale} onToast={notify} />
          )}

          {/* Job costing */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-[var(--wp-text-primary)] mb-4">Job Costing</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Budget</span><span className="font-semibold">${formatCurrency(budget)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Actual Cost</span><span className="font-semibold">${formatCurrency(actualCost)}</span></div>
              {revenue > 0 && <div className="flex justify-between"><span className="text-[var(--wp-text-muted)]">Revenue</span><span className="font-semibold text-[var(--wp-success)]">${formatCurrency(revenue)}</span></div>}
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

          {/* Schedule */}
          <div className="card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wp-text-3)' }}>Schedule</div>
            {(() => {
              const now = new Date()
              const start = job.startDate ? new Date(job.startDate) : null
              const end = job.endDate ? new Date(job.endDate) : null
              const fmt = (d: Date) => d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              const days = (a: Date, b: Date) => Math.max(1, Math.ceil(Math.abs(b.getTime() - a.getTime()) / 86400000))
              let label: string, color: string
              if (job.status === 'completed') { label = locale === 'es' ? 'Completado' : 'Completed'; color = 'var(--wp-text-3)' }
              else if (job.status === 'cancelled') { label = locale === 'es' ? 'Cancelado' : 'Cancelled'; color = 'var(--wp-text-3)' }
              else if (job.status === 'on_hold') { label = locale === 'es' ? 'En pausa' : 'On hold'; color = 'var(--wp-warning-v2)' }
              else if (!start) { label = locale === 'es' ? 'Sin agendar' : 'Not scheduled'; color = 'var(--wp-text-3)' }
              else if (start > now) { const d = days(now, start); label = locale === 'es' ? `Comienza en ${d}d` : `Starts in ${d}d`; color = 'var(--wp-info-v2)' }
              else if (end && end < now && job.status === 'active') { const d = days(end, now); label = locale === 'es' ? `Vencido ${d}d` : `Past due ${d}d`; color = 'var(--wp-error-v2)' }
              else { label = locale === 'es' ? 'En curso' : 'On schedule'; color = 'var(--wp-success-v2)' }

              return (
                <>
                  {start && (
                    <div className="text-xs" style={{ color: 'var(--wp-text-2)' }}>
                      {fmt(start)}{end && ` — ${fmt(end)}`}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color }}>
                    ● {label}
                  </div>
                </>
              )
            })()}
          </div>

          {/* Client */}
          <div className="card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--wp-text-3)' }}>Client</div>
            <div className="flex items-center gap-2.5 mb-3">
              <ClientAvatar name={job.clientName} size="md" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>{job.clientName}</p>
                <p className="text-[10px]" style={{ color: 'var(--wp-text-3)' }}>{job.clientEmail || ''}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {job.clientPhone && (
                <a href={`tel:${job.clientPhone}`} className="flex-1 text-center btn-secondary btn-sm" style={{ minHeight: 'auto', padding: '5px 8px', fontSize: '0.6875rem' }}>Call</a>
              )}
              {job.clientPhone && (
                <a href={`sms:${job.clientPhone}`} className="flex-1 text-center btn-secondary btn-sm" style={{ minHeight: 'auto', padding: '5px 8px', fontSize: '0.6875rem' }}>SMS</a>
              )}
            </div>
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
          <Modal
            title="New Change Order"
            subtitle="Describe the change and list each item with its cost."
            onClose={() => { setShowCoForm(false); setCoLineItems([{ description: '', amount: '' }]); setCoDescription('') }}
            size="lg"
            footer={
              <>
                <span className="text-sm font-semibold mr-auto" style={{ color: 'var(--wp-text)' }}>Total: <span style={{ color: 'var(--wp-brand)' }}>${coTotal.toFixed(2)}</span></span>
                <button type="button" onClick={() => { setShowCoForm(false); setCoLineItems([{ description: '', amount: '' }]); setCoDescription('') }} className="btn-secondary btn-sm">Cancel</button>
                <button type="submit" form="co-form" disabled={isPending} className="btn-primary btn-sm">{isPending ? 'Creating…' : 'Create Change Order'}</button>
              </>
            }
          >
            <form id="co-form" onSubmit={handleCreateChangeOrder} className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--wp-text-2)' }}>Description</label>
                <textarea value={coDescription} onChange={e => setCoDescription(e.target.value)}
                  className="input w-full text-sm" rows={2} placeholder="Describe the change..." />
              </div>

              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--wp-text-2)' }}>Line Items</label>
                <div className="space-y-2">
                  {coLineItems.map((li, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input value={li.description} onChange={e => handleCoLineItemChange(idx, 'description', e.target.value)}
                        className="input text-sm flex-1" placeholder="Item description" required />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--wp-text-3)' }}>$</span>
                        <input type="number" step="0.01" min="0" value={li.amount} onChange={e => handleCoLineItemChange(idx, 'amount', e.target.value)}
                          className="input text-sm w-32 pl-6" placeholder="0.00" required />
                      </div>
                      {coLineItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveCoLineItem(idx)} className="p-1.5 mt-1" style={{ color: 'var(--wp-text-3)' }} aria-label="Remove"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={handleAddCoLineItem} className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: 'var(--wp-brand)' }}>
                  <Plus size={12} /> Add Line Item
                </button>
              </div>
            </form>
          </Modal>
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
                      <div className="absolute right-0 top-full mt-1 bg-card border border-[var(--wp-border)] rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
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
          <Modal
            title="New Work Order"
            subtitle="Instructions the crew will receive (no pricing)."
            onClose={() => { setShowWoForm(false); setWoTitle(''); setWoInstructions('') }}
            size="md"
            footer={
              <>
                <button type="button" onClick={() => { setShowWoForm(false); setWoTitle(''); setWoInstructions('') }} className="btn-secondary btn-sm">Cancel</button>
                <button type="submit" form="wo-form" disabled={isPending} className="btn-primary btn-sm">{isPending ? 'Creating…' : 'Create Work Order'}</button>
              </>
            }
          >
            <form id="wo-form" onSubmit={handleCreateWorkOrder} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--wp-text-2)' }}>Title *</label>
                <input required value={woTitle} onChange={e => setWoTitle(e.target.value)}
                  className="input w-full text-sm" placeholder="Work order title..." />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--wp-text-2)' }}>Instructions</label>
                <textarea value={woInstructions} onChange={e => setWoInstructions(e.target.value)}
                  className="input w-full text-sm" rows={4} placeholder="Crew instructions, scope of work..." />
              </div>
            </form>
          </Modal>
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
      </div>{/* end work orders card */}
        </div>{/* ═══ end RIGHT column ═══ */}
      </div>{/* ═══ end 2-col grid ═══ */}
      </div>
    </div>
  )
}

// ── Clock-in timer card — persistent via job_clock_sessions ──
function ClockInCard({
  jobId, assignedTechnicians, activeSession, locale, onToast,
}: {
  jobId: string
  assignedTechnicians: Technician[]
  activeSession: ActiveClockSession | null
  locale: string
  onToast?: (msg: string, variant?: 'success' | 'error' | 'warning') => void
}) {
  const router = useRouter()
  const [elapsed, setElapsed] = useState(0)
  const [selectedTechId, setSelectedTechId] = useState<string>(assignedTechnicians[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const running = activeSession !== null
  const startedAt = activeSession ? new Date(activeSession.startedAt).getTime() : 0

  useEffect(() => {
    if (!running) { setElapsed(0); return }
    setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [running, startedAt])

  function handleStart() {
    setError(null)
    startTransition(async () => {
      try {
        const { startClock } = await import('@/lib/actions/clock')
        await startClock(jobId, selectedTechId || null)
        router.refresh()
        onToast?.(locale === 'es' ? 'Sesión iniciada' : 'Clock started')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start'
        setError(msg)
        onToast?.(msg, 'error')
      }
    })
  }

  function handleStop() {
    if (!activeSession) return
    if (!window.confirm(locale === 'es' ? '¿Cerrar sesión y crear expense labor?' : 'Stop session and create labor expense?')) return
    setError(null)
    startTransition(async () => {
      try {
        const { stopClock } = await import('@/lib/actions/clock')
        const result = await stopClock(activeSession.id)
        router.refresh()
        const hoursStr = result.hours.toFixed(2)
        const amountStr = result.amount.toFixed(2)
        const msg = result.expenseId
          ? (locale === 'es'
              ? `Sesión cerrada · Expense $${amountStr} creado (${hoursStr}h)`
              : `Clocked out · Expense $${amountStr} created (${hoursStr}h)`)
          : (locale === 'es' ? 'Sesión cerrada (sin expense: asigna rate al técnico)' : 'Clocked out (no expense: set tech rate)')
        onToast?.(msg, result.expenseId ? 'success' : 'warning')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to stop'
        setError(msg)
        onToast?.(msg, 'error')
      }
    })
  }

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const timeStr = `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`

  return (
    <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'var(--wp-text-inverse)' }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ opacity: 0.6 }}>Clock in</div>
      <div className="text-xs mb-3" style={{ opacity: 0.6 }}>
        {running && activeSession?.technicianName
          ? `${activeSession.technicianName} · ${new Date(activeSession.startedAt).toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
          : locale === 'es' ? 'Sin iniciar' : 'Not clocked in'}
      </div>
      <div className="text-3xl font-extrabold tabular-nums mb-4" style={{ letterSpacing: '-0.02em' }}>
        {running ? timeStr : '0h 00m'}
      </div>

      {!running && assignedTechnicians.length > 0 && (
        <select
          value={selectedTechId}
          onChange={e => setSelectedTechId(e.target.value)}
          className="w-full mb-2 py-2 px-2 rounded-lg text-xs"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--wp-text-inverse)', border: '1px solid rgba(255,255,255,0.15)' }}
          disabled={isPending}
        >
          {assignedTechnicians.map(t => (
            <option key={t.id} value={t.id} style={{ color: '#0F172A' }}>{t.name}{t.hourlyRate ? ` · $${t.hourlyRate}/hr` : ''}</option>
          ))}
        </select>
      )}
      {!running && assignedTechnicians.length === 0 && (
        <div className="text-[11px] mb-2" style={{ color: '#FCA5A5' }}>
          {locale === 'es' ? 'Asigna un técnico primero' : 'Assign a technician first'}
        </div>
      )}

      <div className="flex gap-2">
        {!running ? (
          <button
            onClick={handleStart}
            disabled={isPending || assignedTechnicians.length === 0}
            className="flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'white', color: '#0F172A' }}
          >
            {isPending ? '…' : 'Start'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={isPending}
            className="flex-1 py-2.5 text-xs font-bold rounded-lg disabled:opacity-50"
            style={{ background: '#EF4444', color: 'var(--wp-text-inverse)' }}
          >
            {isPending ? (locale === 'es' ? 'Cerrando…' : 'Stopping…') : 'Clock out'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] mt-2" style={{ color: '#FCA5A5' }}>{error}</p>
      )}
    </div>
  )
}
