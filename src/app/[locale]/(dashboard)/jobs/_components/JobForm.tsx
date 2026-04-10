'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createJob, updateJob } from '@/lib/actions/jobs'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type Job = { id: string; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string | null; actualCost: string | null; startDate: Date | null; endDate: Date | null; notes: string | null }
type FormTranslations = { save: string; cancel: string; fields: Record<string, string>; status: Record<JobStatus, string> }

const STATUS_OPTIONS: JobStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

export function JobForm({ translations: t, job }: { translations: FormTranslations; job?: Job }) {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: job?.name ?? '',
    clientName: job?.clientName ?? '',
    clientEmail: job?.clientEmail ?? '',
    clientPhone: job?.clientPhone ?? '',
    address: job?.address ?? '',
    status: (job?.status ?? 'lead') as JobStatus,
    budgetedCost: job?.budgetedCost ?? '0',
    actualCost: job?.actualCost ?? '0',
    startDate: job?.startDate ? new Date(job.startDate).toISOString().split('T')[0] : '',
    endDate: job?.endDate ? new Date(job.endDate).toISOString().split('T')[0] : '',
    notes: job?.notes ?? '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      if (job) {
        await updateJob(job.id, form)
        router.push(`/${locale}/jobs/${job.id}`)
      } else {
        const created = await createJob(form)
        router.push(`/${locale}/jobs/${created.id}`)
      }
      router.refresh()
    })
  }

  const field = (id: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input type={type} value={form[id] as string} onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="plumbr-card p-6 space-y-5">
      {field('name', t.fields.name)}
      <div className="grid grid-cols-2 gap-4">
        {field('clientName', t.fields.clientName)}
        {field('clientPhone', t.fields.clientPhone, 'tel')}
      </div>
      {field('clientEmail', t.fields.clientEmail, 'email')}
      {field('address', t.fields.address)}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobStatus })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field('startDate', t.fields.startDate, 'date')}
        {field('endDate', t.fields.endDate, 'date')}
      </div>
      {field('budgetedCost', t.fields.budgetedCost, 'number')}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields.notes}</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{isPending ? '...' : t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
