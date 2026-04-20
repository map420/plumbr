'use client'

import { useState, useTransition } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTechnician, deleteTechnician } from '@/lib/actions/technicians'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Toast } from '@/components/Toast'
import { Users, Plus, X, Lock, Settings } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { TechnicianCard, type TechStats } from './TechnicianCard'

type FormState = {
  name: string; email: string; phone: string; hourlyRate: string
  type: 'employee' | 'subcontractor'; role: string; tier: string
  rating: string; availabilityStatus: '' | 'available' | 'busy' | 'off'; availabilityNote: string
}

const emptyForm: FormState = {
  name: '', email: '', phone: '', hourlyRate: '',
  type: 'employee', role: '', tier: '',
  rating: '', availabilityStatus: '', availabilityNote: '',
}

export function TeamClient({ initialTechnicians, isPro, locale }: { initialTechnicians: TechStats[]; isPro: boolean; locale: string }) {
  const router = useRouter()
  const [technicians, setTechnicians] = useState(initialTechnicians)
  const [showForm, setShowForm] = useState(false)
  useEscapeKey(showForm, () => setShowForm(false))
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isPending, startTransition] = useTransition()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' } | null>(null)
  const notify = (message: string, variant: 'success' | 'error' | 'warning' = 'success') => setToast({ message, variant })
  const es = locale === 'es'

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        const t = await createTechnician({
          name: form.name,
          email: form.email,
          phone: form.phone,
          hourlyRate: form.hourlyRate,
          type: form.type,
          role: form.role,
          tier: form.tier,
          rating: form.rating,
          availabilityStatus: form.availabilityStatus || null,
          availabilityNote: form.availabilityNote,
        })
        setTechnicians(prev => [...prev, { ...t, jobsMtd: 0, revenueMtd: 0, paidOutMtd: 0, activeJobContext: null } as TechStats])
        setForm(emptyForm)
        setShowForm(false)
        router.refresh()
        notify(es ? `${t.name} agregado al equipo` : `${t.name} added to team`)
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error', 'error')
      }
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      try {
        const name = technicians.find(x => x.id === deleteId)?.name ?? 'Member'
        await deleteTechnician(deleteId)
        setTechnicians(prev => prev.filter(t => t.id !== deleteId))
        setDeleteId(null)
        router.refresh()
        notify(es ? `${name} eliminado` : `${name} removed`)
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Error', 'error')
      }
    })
  }

  if (!isPro) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="page-title">{es ? 'Equipo' : 'Team'}</h1>
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

  const employees = technicians.filter(t => t.type !== 'subcontractor')
  const subs = technicians.filter(t => t.type === 'subcontractor')
  const totalJobsMtd = technicians.reduce((s, t) => s + t.jobsMtd, 0)

  const subtitleFmt = es
    ? `${employees.length} ${employees.length === 1 ? 'miembro activo' : 'miembros activos'}${subs.length > 0 ? ` + ${subs.length} sub${subs.length !== 1 ? 's' : ''}` : ''} · Total jobs este mes: ${totalJobsMtd}`
    : `${employees.length} ${employees.length === 1 ? 'active member' : 'active members'}${subs.length > 0 ? ` + ${subs.length} sub${subs.length !== 1 ? 's' : ''}` : ''} · Total jobs this month: ${totalJobsMtd}`

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 bg-card md:bg-transparent min-h-full">
      {toast && <Toast message={toast.message} variant={toast.variant} onDone={() => setToast(null)} />}
      {deleteId && (
        <ConfirmModal
          title={es ? 'Remover técnico' : 'Remove Technician'}
          message={es ? '¿Seguro que quieres eliminar este técnico? Se desasignará de todos los jobs.' : 'Are you sure you want to remove this technician? They will be unassigned from all jobs.'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
        <div>
          <h1 className="page-title mb-0">Team</h1>
          {technicians.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>{subtitleFmt}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" type="button" title={es ? 'Próximamente' : 'Coming soon'}>
            <Settings size={13} /> {es ? 'Administrar roles' : 'Manage roles'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
            <Plus size={14} /> {es ? 'Crear miembro' : 'Create member'}
          </button>
        </div>
      </div>

      {/* Add technician modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setShowForm(false)} role="dialog" aria-modal="true" aria-label="Add technician">
          <div className="bg-card rounded-xl p-6 max-w-lg w-full my-8 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ color: 'var(--wp-text)' }}>{es ? 'Nuevo miembro' : 'New team member'}</h2>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: 'var(--wp-text-3)' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAdd}>
              <TechnicianFields form={form} onChange={setForm} es={es} />
              <div className="flex gap-2 pt-4 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">{es ? 'Cancelar' : 'Cancel'}</button>
                <button type="submit" disabled={isPending || !form.name || !form.email} className="btn-primary text-sm">
                  {isPending ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Agregar' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {technicians.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title={es ? 'Sin miembros aún' : 'No team members yet'}
          description={es ? 'Agrega tu primer miembro para asignar jobs.' : 'Add your first team member to start assigning jobs.'}
          cta={
            <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
              <Plus size={14} /> {es ? 'Crear miembro' : 'Create member'}
            </button>
          }
        />
      ) : (
        <>
        {/* Employees section */}
        {employees.length > 0 && subs.length > 0 && (
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-3)' }}>
            {es ? 'Miembros del equipo' : 'Team members'}
          </h2>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ opacity: isPending ? 0.6 : 1 }}>
          {employees.map(t => (
            <div key={t.id} className="relative group">
              <TechnicianCard tech={t} locale={locale} />
              <button
                onClick={() => setDeleteId(t.id)}
                className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}
                title={es ? 'Remover' : 'Remove'}
                aria-label={es ? 'Remover' : 'Remove'}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {/* Invite slot */}
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 transition-colors hover:bg-[var(--wp-surface-2)]"
            style={{ border: '2px dashed var(--wp-border-v2)', color: 'var(--wp-text-3)', minHeight: 200 }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--wp-surface-2)' }}>
              <Plus size={20} style={{ color: 'var(--wp-text-3)' }} />
            </div>
            <span className="text-sm font-semibold">{es ? 'Crear miembro' : 'Create member'}</span>
          </button>
        </div>

        {/* Subcontractors section */}
        {subs.length > 0 && (
          <>
            <h2 className="text-xs font-semibold uppercase tracking-wide mt-8 mb-2" style={{ color: 'var(--wp-text-3)' }}>
              {es ? 'Subcontratistas' : 'Subcontractors'} · {subs.length}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ opacity: isPending ? 0.6 : 1 }}>
              {subs.map(t => (
                <div key={t.id} className="relative group">
                  <TechnicianCard tech={t} locale={locale} />
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}
                    title={es ? 'Remover' : 'Remove'}
                    aria-label={es ? 'Remover' : 'Remove'}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        </>
      )}
    </div>
  )
}

function TechnicianFields({ form, onChange, es }: { form: FormState; onChange: (f: FormState) => void; es: boolean }) {
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    onChange({ ...form, [field]: value })

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Tipo' : 'Type'}</label>
        <select
          value={form.type}
          onChange={e => update('type', e.target.value as FormState['type'])}
          className="input w-full"
        >
          <option value="employee">{es ? 'Empleado' : 'Employee'}</option>
          <option value="subcontractor">{es ? 'Subcontratista' : 'Subcontractor'}</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Nombre' : 'Name'} *</label>
        <input required value={form.name} onChange={e => update('name', e.target.value)} className="input" placeholder="John Doe" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Email *</label>
        <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input" placeholder="john@example.com" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Teléfono' : 'Phone'}</label>
        <input value={form.phone} onChange={e => update('phone', e.target.value)} className="input" placeholder="(555) 000-0000" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Tarifa $/hr' : 'Hourly rate $/hr'}</label>
        <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={e => update('hourlyRate', e.target.value)} className="input" placeholder="75.00" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Rol' : 'Role'}</label>
        <select
          value={form.role}
          onChange={e => update('role', e.target.value)}
          className="input w-full"
        >
          <option value="">—</option>
          <option value="Owner">Owner</option>
          <option value="Technician">Technician</option>
          <option value="Apprentice">Apprentice</option>
          <option value="Subcontractor">Subcontractor</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Nivel / Etiqueta' : 'Tier / Label'}</label>
        <input value={form.tier} onChange={e => update('tier', e.target.value)} className="input" placeholder={es ? 'Master plumber, Certified, Year 2…' : 'Master plumber, Certified, Year 2…'} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>Rating (0-5)</label>
        <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e => update('rating', e.target.value)} className="input" placeholder="4.9" />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Disponibilidad' : 'Availability'}</label>
        <select
          value={form.availabilityStatus}
          onChange={e => update('availabilityStatus', e.target.value as FormState['availabilityStatus'])}
          className="input w-full"
        >
          <option value="">—</option>
          <option value="available">{es ? 'Disponible' : 'Available'}</option>
          <option value="busy">{es ? 'Ocupado' : 'Busy'}</option>
          <option value="off">{es ? 'Off today' : 'Off today'}</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--wp-text-2)' }}>{es ? 'Nota de estado' : 'Status note'}</label>
        <input value={form.availabilityNote} onChange={e => update('availabilityNote', e.target.value)} className="input" placeholder={es ? 'libre hasta las 3pm' : 'free until 3pm'} />
      </div>
    </div>
  )
}
