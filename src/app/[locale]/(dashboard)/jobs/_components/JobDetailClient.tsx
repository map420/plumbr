'use client'

import { useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteJob } from '@/lib/actions/jobs'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { ArrowLeft, Edit, Trash2, Plus } from 'lucide-react'

type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

type Job = { id: string; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string | null; actualCost: string | null; startDate: Date | null; notes: string | null }
type Estimate = { id: string; number: string; status: string; total: string }
type Invoice = { id: string; number: string; status: string; total: string }

type T = {
  edit: string; back: string; delete: string
  fields: Record<string, string>
  status: Record<JobStatus, string>
  estimates: string; invoices: string; newEstimate: string; newInvoice: string
  estimateStatus: Record<EstimateStatus, string>
  invoiceStatus: Record<InvoiceStatus, string>
}

export function JobDetailClient({ job, estimates, invoices, translations: t }: { job: Job; estimates: Estimate[]; invoices: Invoice[]; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()

  const budget = parseFloat(job.budgetedCost ?? '0')
  const actual = parseFloat(job.actualCost ?? '0')
  const margin = budget > 0 ? Math.round(((budget - actual) / budget) * 100) : null

  function handleDelete() {
    if (!confirm('Delete this job?')) return
    startTransition(async () => {
      await deleteJob(job.id)
      router.push(`/${locale}/jobs`)
    })
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href={`/${locale}/jobs`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft size={14} /> {t.back}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{job.name}</h1>
          <div className="mt-1"><JobStatusBadge status={job.status as JobStatus} label={t.status[job.status as JobStatus]} /></div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/jobs/${job.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit size={14} /> {t.edit}
          </Link>
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 size={14} /> {t.delete}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 plumbr-card p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">{t.fields.clientEmail}</span><p className="font-medium mt-0.5">{job.clientEmail || '—'}</p></div>
            <div><span className="text-slate-500">{t.fields.clientPhone}</span><p className="font-medium mt-0.5">{job.clientPhone || '—'}</p></div>
            <div><span className="text-slate-500">{t.fields.address}</span><p className="font-medium mt-0.5">{job.address || '—'}</p></div>
            <div><span className="text-slate-500">{t.fields.startDate}</span><p className="font-medium mt-0.5">{job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}</p></div>
          </div>
          {job.notes && <div className="text-sm pt-2 border-t border-slate-100"><span className="text-slate-500">{t.fields.notes}</span><p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{job.notes}</p></div>}
        </div>

        <div className="plumbr-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Job Costing</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t.fields.budgetedCost}</span><span className="font-semibold">${budget.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t.fields.actualCost}</span><span className="font-semibold">${actual.toLocaleString()}</span></div>
            {budget > 0 && (
              <>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${actual > budget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((actual / budget) * 100, 100)}%` }} />
                </div>
                {margin !== null && <p className={`text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}% margin</p>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="plumbr-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{t.estimates}</h3>
          <Link href={`/${locale}/estimates/new?jobId=${job.id}`} className="btn-primary text-xs flex items-center gap-1"><Plus size={13} /> {t.newEstimate}</Link>
        </div>
        {estimates.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
          <div className="space-y-2">
            {estimates.map((e) => (
              <Link key={e.id} href={`/${locale}/estimates/${e.id}`} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors">
                <span className="text-sm font-medium text-[#1E3A5F]">{e.number}</span>
                <div className="flex items-center gap-3">
                  <EstimateStatusBadge status={e.status as EstimateStatus} label={t.estimateStatus[e.status as EstimateStatus]} />
                  <span className="text-sm font-semibold">${parseFloat(e.total).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="plumbr-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{t.invoices}</h3>
          <Link href={`/${locale}/invoices/new?jobId=${job.id}`} className="btn-secondary text-xs flex items-center gap-1"><Plus size={13} /> {t.newInvoice}</Link>
        </div>
        {invoices.length === 0 ? <p className="text-sm text-slate-400">—</p> : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link key={inv.id} href={`/${locale}/invoices/${inv.id}`} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded transition-colors">
                <span className="text-sm font-medium text-[#1E3A5F]">{inv.number}</span>
                <div className="flex items-center gap-3">
                  <InvoiceStatusBadge status={inv.status as InvoiceStatus} label={t.invoiceStatus[inv.status as InvoiceStatus]} />
                  <span className="text-sm font-semibold">${parseFloat(inv.total).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
