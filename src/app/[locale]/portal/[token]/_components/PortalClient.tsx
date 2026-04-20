'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { approveEstimateByToken, rejectEstimateByToken, approveChangeOrderByToken, rejectChangeOrderByToken, createPortalInvoicePaymentLink } from '@/lib/actions/portal'
import { CheckCircle, XCircle, FileText, Receipt, Clock, FileEdit, CreditCard, Loader2, Printer } from 'lucide-react'
import dynamic from 'next/dynamic'

// SignaturePad ships ~15KB of canvas drawing code — only load when the client
// actually opens the "Sign to approve" flow (not on every portal view).
const SignaturePad = dynamic(() => import('@/components/SignaturePad'), {
  ssr: false,
  loading: () => <div className="h-36 rounded-lg bg-slate-100 animate-pulse" />,
})

type LineItem = {
  id: string; type: string; description: string
  quantity: string; unitPrice: string; total: string
}

type EstimateData = {
  type: 'estimate'
  estimate: {
    id: string; number: string; clientName: string; clientEmail: string | null
    status: string; subtotal: string; tax: string; total: string
    notes: string | null; validUntil: Date | null
  }
  lineItems: LineItem[]
}

type InvoiceData = {
  type: 'invoice'
  invoice: {
    id: string; number: string; clientName: string; clientEmail: string | null
    status: string; subtotal: string; tax: string; total: string
    dueDate: Date | null; notes: string | null
    createdAt?: Date; paidAt?: Date | null
  }
  lineItems: LineItem[]
}

type Contractor = { companyName: string; phone: string; email: string; logoUrl: string | null }

type ChangeOrderData = {
  type: 'change_order'
  changeOrder: {
    id: string; number: string; description: string | null
    status: string; subtotal: string; tax: string; total: string
    notes: string | null; signatureDataUrl: string | null; signedByName: string | null
  }
  lineItems: LineItem[]
}

type PortalData = EstimateData | InvoiceData | ChangeOrderData

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-600',
  converted: 'bg-purple-50 text-purple-700',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  overdue: 'bg-red-50 text-red-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

type PortalPhoto = { id: string; url: string; description: string | null }

export function PortalClient({ token, locale, data, contractor, photos = [] }: { token: string; locale: string; data: PortalData; contractor?: Contractor; photos?: PortalPhoto[] }) {
  const t = useTranslations('portal')
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US'
  const [isPending, startTransition] = useTransition()
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null)
  const [showSignature, setShowSignature] = useState(false)
  const [signedName, setSignedName] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  async function handlePayNow() {
    setIsPaying(true)
    setPayError(null)
    try {
      const { url, error } = await createPortalInvoicePaymentLink(token)
      if (error || !url) {
        setPayError(error || 'Unable to create payment link.')
      } else {
        window.location.href = url
      }
    } catch {
      setPayError('Unable to create payment link.')
    } finally {
      setIsPaying(false)
    }
  }

  const isEstimate = data.type === 'estimate'
  const isChangeOrder = data.type === 'change_order'
  const isInvoice = data.type === 'invoice'
  const doc = isEstimate ? data.estimate : isChangeOrder ? data.changeOrder : data.invoice
  const lineItems = data.lineItems
  const statusColors = isEstimate || isChangeOrder ? ESTIMATE_STATUS_COLORS : INVOICE_STATUS_COLORS
  const docLabel = isChangeOrder ? t('docLabel.changeOrder') : isEstimate ? t('docLabel.estimate') : t('docLabel.invoice')
  const statusKeys = ['draft','sent','approved','rejected','converted','paid','overdue','cancelled'] as const
  type StatusKey = typeof statusKeys[number]
  const statusLabel = statusKeys.includes(doc.status as StatusKey) ? t(`status.${doc.status}` as 'status.draft') : doc.status

  function handleApprove() {
    if (!signatureData || !signedName.trim()) return
    startTransition(async () => {
      if (isChangeOrder) {
        await approveChangeOrderByToken(token, { signatureDataUrl: signatureData, signedByName: signedName })
      } else {
        await approveEstimateByToken(token, { signatureDataUrl: signatureData, signedByName: signedName })
      }
      setActionDone('approved')
    })
  }

  function handleReject() {
    startTransition(async () => {
      if (isChangeOrder) {
        await rejectChangeOrderByToken(token, rejectReason || undefined)
      } else {
        await rejectEstimateByToken(token, rejectReason || undefined)
      }
      setShowRejectModal(false)
      setActionDone('rejected')
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-5 md:py-8 md:px-4">
      <style>{`@media print { .portal-no-print { display: none !important } body { background: white !important } }`}</style>
      <div className="max-w-2xl mx-auto">
        {/* Header — slim for invoice (print-layout has its own header), full for estimate/change_order */}
        {isInvoice ? (
          <div className="portal-no-print flex justify-end mb-3">
            <button
              onClick={() => window.print()}
              className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
              title={t('print')}
              aria-label={t('print')}
            >
              <Printer size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-navy-500 flex items-center justify-center">
                {isChangeOrder ? <FileEdit size={18} className="text-white" /> : <FileText size={18} className="text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {docLabel} {doc.number}
                </h1>
                <p className="text-sm text-slate-500">{t('for')} {'clientName' in doc ? doc.clientName : ''}</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="portal-no-print shrink-0 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors"
              title={t('print')}
              aria-label={t('print')}
            >
              <Printer size={16} />
            </button>
          </div>
        )}

        {/* Action done state */}
        {actionDone && (
          <div className={`rounded-xl p-5 mb-6 flex items-center gap-4 ${actionDone === 'approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {actionDone === 'approved'
              ? <CheckCircle size={24} className="text-emerald-600 shrink-0" />
              : <XCircle size={24} className="text-red-500 shrink-0" />
            }
            <div>
              <p className={`font-semibold ${actionDone === 'approved' ? 'text-emerald-800' : 'text-red-700'}`}>
                {actionDone === 'approved'
                  ? (isChangeOrder ? t('done.approvedTitleChangeOrder') : t('done.approvedTitleEstimate'))
                  : (isChangeOrder ? t('done.rejectedTitleChangeOrder') : t('done.rejectedTitleEstimate'))}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {actionDone === 'approved' ? t('done.approvedBody') : t('done.rejectedBody')}
              </p>
            </div>
          </div>
        )}

        {/* Document card — Invoice uses print-template layout; estimate/change_order keeps the card style */}
        {isInvoice && data.type === 'invoice' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-5 print:shadow-none print:border-0 print:rounded-none">
            <div className="px-8 py-8 print:px-0 print:py-0">
              {/* Header — contractor left, invoice meta right */}
              <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold text-navy-500">{contractor?.companyName ?? 'WorkPilot'}</h1>
                  {contractor?.phone && <p className="text-slate-500 text-sm mt-0.5">{contractor.phone}</p>}
                  {contractor?.email && <p className="text-slate-500 text-sm">{contractor.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">{t('docLabel.invoice')}</p>
                  <h2 className="text-xl font-bold text-slate-800">{data.invoice.number}</h2>
                  {data.invoice.createdAt && (
                    <p className="text-slate-500 text-xs mt-1">
                      {t('issued')}: {new Date(data.invoice.createdAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  {data.invoice.dueDate && (
                    <p className="text-slate-500 text-xs">
                      {t('due')}: {new Date(data.invoice.dueDate).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                  <div className="mt-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[doc.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-6 p-3.5 bg-slate-50 rounded-lg">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{t('billTo')}</p>
                <p className="font-semibold text-slate-800 text-sm">{data.invoice.clientName}</p>
                {data.invoice.clientEmail && <p className="text-slate-600 text-xs">{data.invoice.clientEmail}</p>}
              </div>

              {/* Line items */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-navy-500">
                    <th className="text-left py-2 font-semibold text-slate-700 pr-4 text-xs">{t('table.description')}</th>
                    <th className="text-center py-2 font-semibold text-slate-700 w-14 text-xs">{t('table.qty')}</th>
                    <th className="text-right py-2 font-semibold text-slate-700 w-24 text-xs">{t('table.unitPrice')}</th>
                    <th className="text-right py-2 font-semibold text-slate-700 w-24 text-xs">{t('table.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 pr-4 text-slate-700">{item.description}</td>
                      <td className="py-2.5 text-center text-slate-500">{parseFloat(item.quantity)}</td>
                      <td className="py-2.5 text-right text-slate-500">${parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-800">${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="ml-auto max-w-xs">
                <div className="space-y-1.5 text-sm border-t border-slate-200 pt-3">
                  <div className="flex justify-between text-slate-600">
                    <span>{t('subtotal')}</span>
                    <span>${parseFloat(data.invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(data.invoice.tax) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>{t('tax')}</span>
                      <span>${parseFloat(data.invoice.tax).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-base font-bold text-navy-500 pt-2 mt-2 border-t-2 border-navy-500">
                  <span>{t('totalDue')}</span>
                  <span>${parseFloat(data.invoice.total).toFixed(2)}</span>
                </div>
                {data.invoice.paidAt && (
                  <div className="mt-2 text-center">
                    <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                      {t('paidOn')} {new Date(data.invoice.paidAt).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {data.invoice.notes && (
                <div className="mt-6 pt-4 border-t border-slate-200 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-1 text-xs">{t('notes')}</p>
                  <p className="whitespace-pre-wrap">{data.invoice.notes}</p>
                </div>
              )}

              {/* Thank you footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 text-center">
                {t('thankYou')} · {contractor?.companyName ?? 'WorkPilot'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-5">
            {/* Status + meta */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[doc.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {statusLabel}
              </span>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {isEstimate && data.estimate.validUntil && (
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {t('validUntil')} {new Date(data.estimate.validUntil).toLocaleDateString(dateLocale)}
                  </span>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="px-6 pt-5 pb-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-2">{t('table.description')}</th>
                    <th className="text-right pb-2 w-16">{t('table.qty')}</th>
                    <th className="text-right pb-2 w-24">{t('table.unitPrice')}</th>
                    <th className="text-right pb-2 w-24">{t('table.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lineItems.map(item => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-slate-700">{item.description}</td>
                      <td className="py-2.5 text-right text-slate-500">{parseFloat(item.quantity)}</td>
                      <td className="py-2.5 text-right text-slate-500">${parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-800">${parseFloat(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>{t('subtotal')}</span>
                <span>${parseFloat(doc.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(doc.tax) > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>{t('tax')}</span>
                  <span>${parseFloat(doc.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                <span>{t('total')}</span>
                <span>${parseFloat(doc.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {doc.notes && (
              <div className="px-6 pb-5">
                <p className="text-xs text-slate-400 mb-1">{t('notes')}</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{doc.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Invoice — Pay now */}
        {isInvoice && (doc.status === 'sent' || doc.status === 'overdue') && (
          <div className="portal-no-print">
            <button
              onClick={handlePayNow}
              disabled={isPaying}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-navy-500 text-white hover:bg-navy-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isPaying ? <><Loader2 size={16} className="animate-spin" /> {t('pay.redirecting')}</> : <><CreditCard size={16} /> {t('pay.button', { amount: `$${parseFloat(doc.total).toFixed(2)}` })}</>}
            </button>
            {payError && (
              <p className="mt-2 text-xs text-red-600 text-center">{payError}</p>
            )}
          </div>
        )}

        {/* Estimate CTA buttons */}
        {(isEstimate || isChangeOrder) && !actionDone && (doc.status === 'sent' || doc.status === 'draft') && !showSignature && (
          <div className="portal-no-print flex gap-3">
            <button
              onClick={() => setShowSignature(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              {isChangeOrder ? t('approve.approveChangeOrder') : t('approve.approveEstimate')}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isPending}
              className="px-6 py-3 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {t('approve.decline')}
            </button>
          </div>
        )}

        {/* Reject modal with reason */}
        {showRejectModal && (
          <div className="portal-no-print space-y-4 p-4 bg-red-50 rounded-xl">
            <h3 className="font-semibold text-slate-800 text-sm">
              {isChangeOrder ? t('reject.titleChangeOrder') : t('reject.titleEstimate')}
            </h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('reject.reasonLabel')}</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={t('reject.reasonPlaceholder')}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? t('approve.processing') : t('reject.confirm')}
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="px-6 py-3 rounded-xl text-sm border border-slate-200 text-slate-600"
              >
                {t('approve.cancel')}
              </button>
            </div>
          </div>
        )}

        {showSignature && (
          <div className="portal-no-print space-y-4 p-4 bg-slate-50 rounded-xl">
            <h3 className="font-semibold text-slate-800 text-sm">{t('approve.signToApprove')}</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{t('approve.yourName')}</label>
              <input type="text" value={signedName} onChange={e => setSignedName(e.target.value)} placeholder={t('approve.fullName')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <SignaturePad onSave={setSignatureData} onClear={() => setSignatureData(null)} />
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={isPending || !signatureData || !signedName.trim()} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {isPending ? t('approve.processing') : t('approve.signAndApprove')}
              </button>
              <button onClick={() => { setShowSignature(false); setSignatureData(null); setSignedName('') }} className="px-6 py-3 rounded-xl text-sm border border-slate-200 text-slate-600">
                {t('approve.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">{t('photos')} ({photos.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <img key={p.id} src={p.url} alt={p.description || 'Photo'} className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-8">{t('poweredBy')}</p>
      </div>
    </div>
  )
}
