'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createTechnician, updateTechnician, deleteTechnician } from '@/lib/actions/technicians'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Users, Plus, Trash2, Mail, Phone, X, Lock, Check, DollarSign, ChevronRight } from 'lucide-react'
import { ClientAvatar, KpiCard, EmptyState } from '@/components/ui'

type Technician = { id: string; name: string; email: string; phone: string | null; hourlyRate: string | null }
type FormState = { name: string; email: string; phone: string; hourlyRate: string }

const emptyForm: FormState = { name: '', email: '', phone: '', hourlyRate: '' }

export function TeamClient({ initialTechnicians, isPro, locale }: { initialTechnicians: Technician[]; isPro: boolean; locale: string }) {
  const router = useRouter()
  const currentLocale = useLocale()
  void locale
  const [technicians, setTechnicians] = useState(initialTechnicians)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const t = await createTechnician(form)
      setTechnicians(prev => [...prev, t])
      setForm(emptyForm)
      setShowForm(false)
    })
  }

  function startEdit(t: Technician) {
    setEditId(t.id)
    setEditForm({ name: t.name, email: t.email, phone: t.phone ?? '', hourlyRate: t.hourlyRate ?? '' })
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    startTransition(async () => {
      const updated = await updateTechnician(editId, editForm)
      setTechnicians(prev => prev.map(t => t.id === editId ? updated : t))
      setEditId(null)
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      await deleteTechnician(deleteId)
      setTechnicians(prev => prev.filter(t => t.id !== deleteId))
      setDeleteId(null)
      router.refresh()
    })
  }

  if (!isPro) {
    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="page-title">Team</h1>
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--wp-warning-bg-v2)' }}>
            <Lock size={24} style={{ color: 'var(--wp-warning-v2)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--wp-text)' }}>Pro feature</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--wp-text-2)' }}>
            Team management is available on the Pro plan. Add technicians, assign them to jobs, and filter the field view by team member.
          </p>
          <Link href={`/${locale}/pricing`} className="btn-primary inline-flex items-center gap-2 text-sm">
            Upgrade to Pro — $49/mo
          </Link>
        </div>
      </div>
    )
  }

  const avgRate = technicians.length > 0
    ? technicians.reduce((s, t) => s + (parseFloat(t.hourlyRate ?? '0') || 0), 0) / technicians.length
    : 0

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-white md:bg-transparent min-h-full max-w-5xl">
      {deleteId && (
        <ConfirmModal
          title="Remove Technician"
          message="Are you sure you want to remove this technician? They will be unassigned from all jobs."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">Team</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {technicians.length} {technicians.length === 1 ? 'technician' : 'technicians'}
            {avgRate > 0 && (
              <>{' · '}<span style={{ color: 'var(--wp-text)', fontWeight: 500 }}>${avgRate.toFixed(0)}/hr</span> avg</>
            )}
          </p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null) }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Technician
        </button>
      </div>

      {technicians.length > 0 && (
        <div className="hidden md:grid grid-cols-3 gap-2.5 mb-5">
          <KpiCard tone="info" label="Active techs" value={technicians.length} />
          <KpiCard
            tone="success"
            label="Avg hourly rate"
            value={avgRate > 0 ? `$${avgRate.toFixed(0)}/hr` : '—'}
          />
          <KpiCard
            tone="brand"
            label="With rate set"
            value={technicians.filter(t => t.hourlyRate).length}
            sub={`of ${technicians.length}`}
          />
        </div>
      )}

      {/* Add technician modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--wp-text)' }}>New Technician</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: 'var(--wp-text-3)' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <TechnicianFields form={form} onChange={setForm} />
              <div className="flex gap-2 pt-4 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? 'Saving…' : 'Add Technician'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {technicians.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="No technicians yet"
          description="Add your first technician to start assigning jobs."
          cta={
            <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
              <Plus size={14} /> Add Technician
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" style={{ opacity: isPending ? 0.6 : 1 }}>
          {technicians.map((t, idx) => (
            <div
              key={t.id}
              className="rounded-[10px] overflow-hidden transition-all"
              style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-1)', animation: 'fadeSlideIn 0.3s ease both', animationDelay: `${idx * 30}ms` }}
            >
              {editId === t.id ? (
                <form onSubmit={handleUpdate} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--wp-text)' }}>Editing {t.name}</h3>
                    <button type="button" onClick={() => setEditId(null)} style={{ color: 'var(--wp-text-3)' }}><X size={15} /></button>
                  </div>
                  <TechnicianFields form={editForm} onChange={setEditForm} />
                  <div className="flex gap-2 pt-4">
                    <button type="submit" disabled={isPending} className="btn-primary text-sm flex items-center gap-1.5">
                      <Check size={14} />{isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="group">
                  <div
                    onClick={() => router.push(`/${currentLocale}/team/${t.id}`)}
                    className="p-5 cursor-pointer transition-colors hover:bg-[var(--wp-surface-2)]"
                  >
                    <div className="flex items-start gap-3">
                      <ClientAvatar name={t.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--wp-text)' }}>{t.name}</p>
                        {t.hourlyRate && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                            <DollarSign size={10} />${parseFloat(t.hourlyRate).toFixed(0)}/hr
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--wp-text-3)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                        <Mail size={11} style={{ color: 'var(--wp-text-3)' }} />
                        <span className="truncate">{t.email}</span>
                      </div>
                      {t.phone && (
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                          <Phone size={11} style={{ color: 'var(--wp-text-3)' }} /> {t.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex border-t" style={{ borderColor: 'var(--wp-border-light)' }}>
                    <button
                      onClick={() => startEdit(t)}
                      className="flex-1 py-2 text-xs font-medium transition-colors hover:bg-[var(--wp-surface-2)]"
                      style={{ color: 'var(--wp-text-2)' }}
                    >
                      Edit
                    </button>
                    <div style={{ width: 1, background: 'var(--wp-border-light)' }} />
                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="flex-1 py-2 text-xs font-medium transition-colors hover:bg-[var(--wp-error-bg-v2)]"
                      style={{ color: 'var(--wp-text-2)' }}
                    >
                      <Trash2 size={12} className="inline mr-1" />Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Invite CTA card */}
          <button
            onClick={() => { setShowForm(true); setEditId(null) }}
            className="rounded-[10px] flex flex-col items-center justify-center gap-2 py-10 transition-colors hover:bg-[var(--wp-surface-2)]"
            style={{ border: '2px dashed var(--wp-border-v2)', color: 'var(--wp-text-3)', minHeight: 180 }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--wp-surface-2)' }}>
              <Plus size={20} style={{ color: 'var(--wp-text-3)' }} />
            </div>
            <span className="text-sm font-semibold">Invite member</span>
          </button>
        </div>
      )}
    </div>
  )
}

function TechnicianFields({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  const f = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [field]: e.target.value })

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Name *</label>
        <input required value={form.name} onChange={f('name')} className="input" placeholder="John Doe" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Email *</label>
        <input required type="email" value={form.email} onChange={f('email')} className="input" placeholder="john@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Phone</label>
        <input value={form.phone} onChange={f('phone')} className="input" placeholder="(555) 000-0000" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Hourly rate ($/hr)</label>
        <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={f('hourlyRate')} className="input" placeholder="75.00" />
      </div>
    </div>
  )
}
