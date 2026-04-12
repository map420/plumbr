'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updateClient } from '@/lib/actions/clients'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { Toast } from '@/components/Toast'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Mail, Phone, MapPin, FileText, Briefcase, Receipt, Edit2, Check, X } from 'lucide-react'
import type { EstimateStatus } from '@/lib/store/estimates'
import type { JobStatus } from '@/lib/store/jobs'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null }
type Job = { id: string; name: string; status: string; budgetedCost: string }
type Estimate = { id: string; number: string; status: string; total: string; createdAt: Date }
type Invoice = { id: string; number: string; status: string; total: string; dueDate: Date | null }

export function ClientDetailClient({ client, jobs, estimates, invoices }: {
  client: Client; jobs: Job[]; estimates: Estimate[]; invoices: Invoice[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ name: client.name, email: client.email ?? '', phone: client.phone ?? '', address: client.address ?? '', notes: client.notes ?? '' })

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)

  function handleSave() {
    startTransition(async () => {
      await updateClient(client.id, form)
      setEditing(false)
      setSaved(true)
      router.refresh()
    })
  }

  const statusColors: Record<string, string> = {
    lead: 'bg-slate-100 text-slate-600', active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
    draft: 'bg-slate-100 text-slate-600', sent: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700', paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-6">
      {saved && <Toast message="Client updated successfully!" onDone={() => setSaved(false)} />}
      <Breadcrumbs items={[{ label: 'Clients', href: `/${locale}/clients` }, { label: client.name }]} />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {editing ? (
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="plumbr-input text-2xl font-bold mb-1 w-72" />
          ) : (
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
          )}
          <p className="text-slate-500 text-sm">Client</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={isPending} className="btn-primary flex items-center gap-1 text-sm"><Check size={14} /> Save</button>
              <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-1 text-sm"><X size={14} /> Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1 text-sm"><Edit2 size={14} /> Edit</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Jobs', value: jobs.length },
          { label: 'Total Estimates', value: estimates.length },
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
        ].map(s => (
          <div key={s.label} className="plumbr-card p-4 text-center">
            <p className="text-2xl font-bold text-[#1E3A5F]">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div className="plumbr-card p-5 space-y-3">
        <h2 className="font-semibold text-slate-800 mb-3">Contact Info</h2>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500">Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="plumbr-input mt-1" /></div>
              <div><label className="text-xs text-slate-500">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="plumbr-input mt-1" /></div>
            </div>
            <div><label className="text-xs text-slate-500">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="plumbr-input mt-1" /></div>
            <div><label className="text-xs text-slate-500">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="plumbr-input mt-1 resize-none" /></div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {client.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14} /> {client.email}</div>}
            {client.phone && <div className="flex items-center gap-2 text-slate-600"><Phone size={14} /> {client.phone}</div>}
            {client.address && <div className="flex items-center gap-2 text-slate-600"><MapPin size={14} /> {client.address}</div>}
            {client.notes && <p className="text-slate-500 mt-2 italic">{client.notes}</p>}
            {!client.email && !client.phone && !client.address && !client.notes && (
              <p className="text-slate-400">No contact info.</p>
            )}
          </div>
        )}
      </div>

      {/* Jobs */}
      <div className="plumbr-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Briefcase size={16} /> Jobs</h2>
          <Link href={`/${locale}/jobs/new`} className="text-xs text-[#1E3A5F] hover:underline">+ New Job</Link>
        </div>
        {jobs.length === 0 ? <p className="p-4 text-sm text-slate-400">No jobs yet.</p> : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/${locale}/jobs/${j.id}`} className="font-medium text-[#1E3A5F] hover:underline">{j.name}</Link></td>
                  <td className="px-4 py-3"><JobStatusBadge status={j.status as JobStatus} label={j.status.charAt(0).toUpperCase() + j.status.slice(1)} /></td>
                  <td className="px-4 py-3 text-right text-slate-600">${parseFloat(j.budgetedCost).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Estimates */}
      <div className="plumbr-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><FileText size={16} /> Estimates</h2>
          <Link href={`/${locale}/estimates/new`} className="text-xs text-[#1E3A5F] hover:underline">+ New Estimate</Link>
        </div>
        {estimates.length === 0 ? <p className="p-4 text-sm text-slate-400">No estimates yet.</p> : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {estimates.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/${locale}/estimates/${e.id}`} className="font-medium text-[#1E3A5F] hover:underline">{e.number}</Link></td>
                  <td className="px-4 py-3"><EstimateStatusBadge status={e.status as EstimateStatus} label={e.status.charAt(0).toUpperCase() + e.status.slice(1)} /></td>
                  <td className="px-4 py-3 text-right text-slate-600">${parseFloat(e.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoices */}
      <div className="plumbr-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2"><Receipt size={16} /> Invoices</h2>
        </div>
        {invoices.length === 0 ? <p className="p-4 text-sm text-slate-400">No invoices yet.</p> : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {invoices.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/${locale}/invoices/${i.id}`} className="font-medium text-[#1E3A5F] hover:underline">{i.number}</Link></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[i.status] ?? ''}`}>{i.status}</span></td>
                  <td className="px-4 py-3 text-slate-500">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">${parseFloat(i.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
