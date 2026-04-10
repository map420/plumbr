'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getInvoices, isOverdue, updateInvoice, Invoice, InvoiceStatus } from '@/lib/store/invoices'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { Receipt, Plus } from 'lucide-react'

type Translations = {
  title: string; new: string; empty: string; markAsPaid: string
  status: Record<InvoiceStatus, string>
  fields: { number: string; clientName: string; dueDate: string; total: string }
}

export function InvoicesClient({ translations: t }: { translations: Translations }) {
  const locale = useLocale()
  const [invoices, setInvoices] = useState<Invoice[]>([])

  function load() {
    const all = getInvoices().map((inv) => ({
      ...inv,
      status: isOverdue(inv) ? 'overdue' as InvoiceStatus : inv.status,
    }))
    setInvoices(all)
  }

  useEffect(() => { load() }, [])

  function handleMarkPaid(id: string) {
    updateInvoice(id, { status: 'paid', paidAt: new Date().toISOString() })
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <Link href={`/${locale}/invoices/new`} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t.new}
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="plumbr-card p-12 text-center">
          <Receipt size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{t.empty}</p>
        </div>
      ) : (
        <div className="plumbr-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.number}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.clientName}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t.fields.dueDate}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t.fields.total}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/invoices/${inv.id}`} className="font-medium text-[#1E3A5F] hover:underline">
                      {inv.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.clientName}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={inv.status} label={t.status[inv.status]} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">${inv.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                      <button onClick={() => handleMarkPaid(inv.id)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">
                        {t.markAsPaid}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
