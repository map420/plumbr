'use client'

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Phone, DollarSign, Clock, ArrowLeft, Briefcase, Edit2, Check, X } from 'lucide-react'
import { updateTechnician } from '@/lib/actions/technicians'

type Technician = { id: string; name: string; email: string; phone: string | null; hourlyRate: string | null }
type Expense = { id: string; jobId: string; description: string; type: string; amount: string; date: Date; hours: string | null; ratePerHour: string | null }
type Job = { id: string; name: string; clientName: string }

function startOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function TechnicianProfileClient({ technician, laborExpenses, jobs, locale }: {
  technician: Technician
  laborExpenses: Expense[]
  jobs: Job[]
  locale: string
}) {
  const router = useRouter()
  const [editingRate, setEditingRate] = useState(false)
  const [rateValue, setRateValue] = useState(technician.hourlyRate ?? '')
  const [currentRate, setCurrentRate] = useState(technician.hourlyRate)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: technician.name, email: technician.email, phone: technician.phone ?? '' })
  const [isPending, startTransition] = useTransition()

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateTechnician(technician.id, { name: profileForm.name, email: profileForm.email, phone: profileForm.phone || undefined })
      setEditingProfile(false)
      router.refresh()
    })
  }

  function handleSaveRate() {
    startTransition(async () => {
      await updateTechnician(technician.id, { hourlyRate: rateValue || undefined })
      setCurrentRate(rateValue || null)
      setEditingRate(false)
    })
  }

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]))

  const totalHours = laborExpenses.reduce((s, e) => s + parseFloat(e.hours ?? '0'), 0)
  const totalCost = laborExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  const monthStart = startOfMonth()
  const monthExpenses = laborExpenses.filter(e => new Date(e.date) >= monthStart)
  const monthHours = monthExpenses.reduce((s, e) => s + parseFloat(e.hours ?? '0'), 0)
  const monthCost = monthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/team`} className="transition-colors" style={{ color: 'var(--wp-text-muted)' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{technician.name}</h1>
      </div>

      {/* Info card */}
      <div className="card p-5 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ background: 'var(--wp-primary)' }}>
              {technician.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} style={{ color: 'var(--wp-text-muted)' }} /> {technician.email}
              </div>
              {technician.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={13} style={{ color: 'var(--wp-text-muted)' }} /> {technician.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                {editingRate ? (
                  <div className="flex items-center gap-1">
                    <DollarSign size={13} className="text-emerald-600" />
                    <input
                      type="number" min="0" step="0.01"
                      value={rateValue}
                      onChange={e => setRateValue(e.target.value)}
                      className="input w-20 py-0.5 text-sm"
                      placeholder="75"
                      autoFocus
                    />
                    <span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>/hr</span>
                    <button onClick={handleSaveRate} disabled={isPending} className="p-1 text-emerald-600 hover:text-emerald-700">
                      <Check size={14} />
                    </button>
                    <button onClick={() => { setEditingRate(false); setRateValue(currentRate ?? '') }} className="p-1" style={{ color: 'var(--wp-text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingRate(true)} className="flex items-center gap-1.5 group">
                    {currentRate ? (
                      <span className="font-medium text-emerald-600 flex items-center gap-1">
                        <DollarSign size={13} />${parseFloat(currentRate).toFixed(0)}/hr base rate
                      </span>
                    ) : (
                      <span style={{ color: 'var(--wp-text-muted)' }}>No rate set</span>
                    )}
                    <Edit2 size={11} className="transition-colors" style={{ color: 'var(--wp-border)' }} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setEditingProfile(v => !v)} className="text-xs transition-colors rounded-lg px-3 py-1.5 flex items-center gap-1.5" style={{ color: 'var(--wp-text-muted)', border: '1px solid var(--wp-border)' }}>
            <Edit2 size={11} /> Edit
          </button>
        </div>
      </div>

      {/* Inline profile edit */}
      {editingProfile && (
        <form onSubmit={handleSaveProfile} className="card p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ color: 'var(--wp-text-muted)' }}>
            <div>
              <label className="text-xs font-medium mb-1 block">Name *</label>
              <input required value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Email *</label>
              <input required type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Phone</label>
              <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={isPending} className="btn-primary text-sm">{isPending ? 'Saving…' : 'Save changes'}</button>
            <button type="button" onClick={() => setEditingProfile(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Hours', value: `${monthHours.toFixed(1)}h`, sub: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }), icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Labor cost', value: `$${monthCost.toLocaleString()}`, sub: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Hours', value: `${totalHours.toFixed(1)}h`, sub: 'All time', icon: Clock, color: 'text-gray-600 bg-gray-100' },
          { label: 'Labor cost', value: `$${totalCost.toLocaleString()}`, sub: 'All time', icon: DollarSign, color: 'text-gray-600 bg-gray-100' },
        ].map(stat => (
          <div key={stat.label + stat.sub} className="card p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
              <stat.icon size={15} />
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--wp-text-primary)' }}>{stat.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-muted)' }}>{stat.label}</p>
            <p className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Labor history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--wp-text-primary)' }}>Labor history</h2>
        </div>
        {laborExpenses.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--wp-text-muted)' }}>No labor entries yet.</div>
        ) : (
          <div>
            {laborExpenses.map(exp => {
              const job = jobMap[exp.jobId]
              return (
                <div key={exp.id} className="flex items-center justify-between px-5 py-3 transition-colors" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Briefcase size={13} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      {job ? (
                        <Link href={`/${locale}/jobs/${job.id}`} className="text-sm font-medium hover:underline truncate block" style={{ color: 'var(--wp-primary)' }}>
                          {job.name}
                        </Link>
                      ) : (
                        <p className="text-sm truncate" style={{ color: 'var(--wp-text-muted)' }}>Unknown job</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-muted)' }}>
                        {parseFloat(exp.hours ?? '0').toFixed(1)} hrs
                        {exp.ratePerHour ? ` @ $${parseFloat(exp.ratePerHour).toFixed(0)}/hr` : ''}
                        {' · '}{new Date(exp.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm shrink-0" style={{ color: 'var(--wp-text-primary)' }}>${parseFloat(exp.amount).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        )}
        {laborExpenses.length > 0 && (
          <div className="px-5 py-3 flex justify-between text-sm font-semibold" style={{ borderTop: '1px solid var(--wp-border-light)', background: 'var(--wp-bg-muted)', color: 'var(--wp-text-secondary)' }}>
            <span>{totalHours.toFixed(1)} total hours</span>
            <span>${totalCost.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
