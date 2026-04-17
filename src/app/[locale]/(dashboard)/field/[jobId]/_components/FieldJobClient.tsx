'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateJob } from '@/lib/actions/jobs'
import { createExpense } from '@/lib/actions/expenses'
import { getChecklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, initializeChecklist } from '@/lib/actions/checklist'
import { PhotoUploader } from '@/components/PhotoUploader'
import { PhotoGallery } from '@/components/PhotoGallery'
import { getPhotosByJob } from '@/lib/actions/photos'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { CheckSquare, Square, Camera, MapPin, ExternalLink, Clock, CheckCircle2, Plus, Trash2, X, ClipboardList } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; status: string; address: string | null }
type T = { todaysJobs: string; checklist: string; photos: string; uploadPhoto: string; status: Record<JobStatus, string> }
type ChecklistItem = { id: string; label: string; completed: boolean; completedAt: Date | null }
type WorkOrderItem = { id: string; number: string; title: string; instructions: string | null; status: string }

export function FieldJobClient({ job, locale, workOrders = [], translations: t }: { job: Job; locale: string; workOrders?: WorkOrderItem[]; translations: T }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [hoursLogged, setHoursLogged] = useState(false)
  const [isLoggingHours, startLoggingHours] = useTransition()

  // Photos
  const [photos, setPhotos] = useState<{ id: string; url: string; description: string | null; thumbnailUrl: string | null }[]>([])

  // DB-backed checklist
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)

  useEffect(() => {
    initializeChecklist(job.id).then(data => {
      setItems(data as ChecklistItem[])
      setLoading(false)
    }).catch(() => setLoading(false))
    getPhotosByJob(job.id).then(p => setPhotos(p as any)).catch(() => {})
  }, [job.id])

  async function handleToggle(item: ChecklistItem) {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed, completedAt: !i.completed ? new Date() : null } : i))
    await toggleChecklistItem(item.id, !item.completed)
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    const created = await addChecklistItem(job.id, newItem.trim())
    setItems(prev => [...prev, created as ChecklistItem])
    setNewItem('')
    setShowAddItem(false)
  }

  async function handleDeleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteChecklistItem(id)
  }

  function markComplete() {
    startTransition(async () => { await updateJob(job.id, { status: 'completed' }); router.push(`/${locale}/field`) })
  }

  function logHours(e: React.FormEvent) {
    e.preventDefault()
    const h = parseFloat(hours)
    const r = parseFloat(rate)
    if (!h || h <= 0) return
    const amount = r > 0 ? (h * r).toFixed(2) : '0.00'
    startLoggingHours(async () => {
      await createExpense(job.id, {
        description: `${h}h labor`,
        type: 'labor',
        amount,
        date: new Date().toISOString(),
        hours: String(h),
        ratePerHour: r > 0 ? String(r) : undefined,
      })
      setHours('')
      setRate('')
      setHoursLogged(true)
    })
  }

  const completedCount = items.filter(i => i.completed).length
  const totalCount = items.length || 1

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Breadcrumbs items={[{ label: 'Field', href: `/${locale}/field` }, { label: job.name }]} />

      <div className="card p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--wp-text-primary)' }}>{job.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--wp-text-muted)' }}>{job.clientName}</p>
          </div>
          <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 text-xs hover:underline shrink-0 mt-1" style={{ color: 'var(--wp-primary)' }}>
            <ExternalLink size={12} /> Full details
          </Link>
        </div>
        {job.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: 'var(--wp-accent)' }}>
            <MapPin size={12} /> {job.address}
          </a>
        )}
        <div className="mt-2">
          <JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} />
        </div>
      </div>

      {/* Checklist — DB-backed, customizable */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.checklist}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{completedCount}/{items.length}</span>
            <button onClick={() => setShowAddItem(!showAddItem)} style={{ color: 'var(--wp-accent)' }}>
              {showAddItem ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full h-1.5 mb-4" style={{ background: 'var(--wp-bg-muted)' }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(completedCount / totalCount) * 100}%`, background: 'var(--wp-accent)' }} />
        </div>

        {/* Add custom item */}
        {showAddItem && (
          <form onSubmit={handleAddItem} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              placeholder="Add custom task..."
              className="flex-1 input text-sm"
              autoFocus
            />
            <button type="submit" className="btn-primary text-xs px-3">Add</button>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--wp-bg-muted)' }} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 group">
                <button onClick={() => handleToggle(item)}
                  className="flex-1 flex items-center gap-3 p-2 rounded-lg transition-colors text-left">
                  {item.completed
                    ? <CheckSquare size={18} className="text-green-500 shrink-0" />
                    : <Square size={18} className="shrink-0" style={{ color: 'var(--wp-border)' }} />}
                  <span className="text-sm" style={{ color: item.completed ? 'var(--wp-text-muted)' : 'var(--wp-text-secondary)', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.label}</span>
                </button>
                <button onClick={() => handleDeleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  style={{ color: 'var(--wp-border)' }}
                  aria-label="Delete task">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Hours */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} style={{ color: 'var(--wp-primary)' }} />
          <h2 className="font-semibold">Log Hours</h2>
        </div>
        {hoursLogged ? (
          <div className="flex items-center gap-2 text-green-600 text-sm py-2">
            <CheckCircle2 size={16} /> Hours logged as labor expense
          </div>
        ) : (
          <form onSubmit={logHours} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs mb-1">Hours worked</label>
                <input type="number" min="0.25" step="0.25" value={hours} onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 4" className="input text-sm w-full" required />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1">Rate/hr (optional)</label>
                <input type="number" min="0" step="1" value={rate} onChange={e => setRate(e.target.value)}
                  placeholder="e.g. 75" className="input text-sm w-full" />
              </div>
            </div>
            <button type="submit" disabled={isLoggingHours} className="btn-secondary text-sm disabled:opacity-50">
              {isLoggingHours ? 'Logging...' : 'Log as Labor Expense'}
            </button>
          </form>
        )}
      </div>

      {/* Work Orders — crew instructions */}
      {workOrders.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} style={{ color: 'var(--wp-primary)' }} />
            <h2 className="font-semibold">Work Orders</h2>
          </div>
          <div className="space-y-3">
            {workOrders.map(wo => (
              <div key={wo.id} className="rounded-lg p-3" style={{ border: '1px solid var(--wp-border-light)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--wp-primary)' }}>{wo.number}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    wo.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    wo.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{wo.status}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--wp-text-secondary)' }}>{wo.title}</p>
                {wo.instructions && (
                  <div className="mt-2 p-2 rounded text-xs whitespace-pre-wrap" style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-secondary)' }}>
                    {wo.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.photos}</h2>
          <PhotoUploader jobId={job.id} onUploaded={(photo) => setPhotos(prev => [...prev, photo as any])} />
        </div>
        <PhotoGallery photos={photos} canDelete />
        {photos.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--wp-text-muted)' }}>No photos yet. Use the button above to capture.</p>}
      </div>

      {job.status !== 'completed' && (
        <button onClick={markComplete} disabled={isPending} className="w-full btn-primary py-3 text-sm disabled:opacity-50">
          Mark Job as Completed
        </button>
      )}
    </div>
  )
}
