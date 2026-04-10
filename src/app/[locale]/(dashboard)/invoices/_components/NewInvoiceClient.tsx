'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createInvoice } from '@/lib/store/invoices'

type T = { save: string; cancel: string; fields: Record<string, string> }

export function NewInvoiceClient({ translations: t }: { translations: T }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const jobId = searchParams.get('jobId') ?? ''

  const [form, setForm] = useState({ clientName: '', clientEmail: '', dueDate: '', notes: '' })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : ''
    const invoice = createInvoice(
      { jobId, estimateId: '', clientName: form.clientName, clientEmail: form.clientEmail, status: 'draft', subtotal: 0, tax: 0, total: 0, dueDate, paidAt: '', notes: form.notes },
      []
    )
    router.push(`/${locale}/invoices/${invoice.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="plumbr-card p-6 space-y-4">
      {(['clientName', 'clientEmail', 'dueDate', 'notes'] as const).map((key) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields[key]}</label>
          {key === 'notes' ? (
            <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          ) : (
            <input type={key === 'dueDate' ? 'date' : key === 'clientEmail' ? 'email' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key === 'clientName'} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary text-sm">{t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
