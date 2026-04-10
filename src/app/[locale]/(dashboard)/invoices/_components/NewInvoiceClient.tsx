'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createInvoice } from '@/lib/actions/invoices'

type T = { save: string; cancel: string; fields: Record<string, string> }

export function NewInvoiceClient({ translations: t }: { translations: T }) {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params.locale as string
  const jobId = searchParams.get('jobId') ?? ''
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const dueDate = fd.get('dueDate') as string
    startTransition(async () => {
      const invoice = await createInvoice(
        { jobId, estimateId: '', clientName: fd.get('clientName') as string, clientEmail: fd.get('clientEmail') as string, status: 'draft', subtotal: 0, tax: 0, total: 0, dueDate: dueDate ? new Date(dueDate).toISOString() : '', notes: fd.get('notes') as string },
        []
      )
      router.push(`/${locale}/invoices/${invoice.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="plumbr-card p-6 space-y-4">
      {(['clientName', 'clientEmail', 'dueDate', 'notes'] as const).map((key) => (
        <div key={key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.fields[key]}</label>
          {key === 'notes' ? (
            <textarea name={key} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
          ) : (
            <input name={key} type={key === 'dueDate' ? 'date' : key === 'clientEmail' ? 'email' : 'text'} required={key === 'clientName'} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">{t.save}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">{t.cancel}</button>
      </div>
    </form>
  )
}
