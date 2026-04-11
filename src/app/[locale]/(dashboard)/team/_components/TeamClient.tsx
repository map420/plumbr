'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTechnician, deleteTechnician } from '@/lib/actions/technicians'
import { Users, Plus, Trash2, Mail, Phone, X } from 'lucide-react'

type Technician = { id: string; name: string; email: string; phone: string | null }

export function TeamClient({ initialTechnicians }: { initialTechnicians: Technician[] }) {
  const router = useRouter()
  const [technicians, setTechnicians] = useState(initialTechnicians)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const t = await createTechnician(form)
      setTechnicians(prev => [...prev, t])
      setForm({ name: '', email: '', phone: '' })
      setShowForm(false)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this technician?')) return
    startTransition(async () => {
      await deleteTechnician(id)
      setTechnicians(prev => prev.filter(t => t.id !== id))
      router.refresh()
    })
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Technician
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="plumbr-card p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-800">New Technician</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500">Name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="plumbr-input mt-1" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="plumbr-input mt-1" placeholder="john@example.com" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="plumbr-input mt-1" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

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
            <div key={t.id} className="plumbr-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{t.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={11} /> {t.email}</span>
                    {t.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} /> {t.phone}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
