'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTechnician, updateTechnician, deleteTechnician } from '@/lib/actions/technicians'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Users, Plus, Trash2, Mail, Phone, X, Lock, Pencil, Check, DollarSign } from 'lucide-react'

type Technician = { id: string; name: string; email: string; phone: string | null; hourlyRate: string | null }
type FormState = { name: string; email: string; phone: string; hourlyRate: string }

const emptyForm: FormState = { name: '', email: '', phone: '', hourlyRate: '' }

export function TeamClient({ initialTechnicians, isPro, locale }: { initialTechnicians: Technician[]; isPro: boolean; locale: string }) {
  const router = useRouter()
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
      <div className="p-4 md:p-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        </div>
        <div className="plumbr-card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Pro feature</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
            Team management is available on the Pro plan. Add technicians, assign them to jobs, and filter the field view by team member.
          </p>
          <Link href={`/${locale}/pricing`} className="btn-primary inline-flex items-center gap-2 text-sm">
            Upgrade to Pro — $49/mo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {deleteId && (
        <ConfirmModal
          title="Remove Technician"
          message="Are you sure you want to remove this technician? They will be unassigned from all jobs."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <button onClick={() => { setShowForm(v => !v); setEditId(null) }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Technician
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="plumbr-card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">New Technician</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <TechnicianFields form={form} onChange={setForm} />
          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      {technicians.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No technicians yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
            <Plus size={16} /> Add Technician
          </button>
        </div>
      ) : (
        <div className="space-y-3" style={{ opacity: isPending ? 0.6 : 1 }}>
          {technicians.map(t => (
            <div key={t.id} className="plumbr-card overflow-hidden">
              {editId === t.id ? (
                /* Edit form inline */
                <form onSubmit={handleUpdate} className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 text-sm">Editing {t.name}</h3>
                    <button type="button" onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                  </div>
                  <TechnicianFields form={editForm} onChange={setEditForm} />
                  <div className="flex gap-2 pt-4">
                    <button type="submit" disabled={isPending} className="btn-primary text-sm flex items-center gap-1.5">
                      <Check size={14} />{isPending ? 'Saving…' : 'Save changes'}
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              ) : (
                /* Card view */
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{t.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={11} />{t.email}</span>
                        {t.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} />{t.phone}</span>}
                        {t.hourlyRate && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <DollarSign size={10} />{parseFloat(t.hourlyRate).toFixed(0)}/hr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(t)} className="p-1.5 text-slate-300 hover:text-[#1E3A5F] transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TechnicianFields({ form, onChange }: { form: FormState; onChange: (f: FormState) => void }) {
  const f = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [field]: e.target.value })

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Name *</label>
        <input required value={form.name} onChange={f('name')} className="plumbr-input" placeholder="John Doe" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Email *</label>
        <input required type="email" value={form.email} onChange={f('email')} className="plumbr-input" placeholder="john@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
        <input value={form.phone} onChange={f('phone')} className="plumbr-input" placeholder="(555) 000-0000" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Hourly rate ($/hr)</label>
        <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={f('hourlyRate')} className="plumbr-input" placeholder="75.00" />
      </div>
    </div>
  )
}
