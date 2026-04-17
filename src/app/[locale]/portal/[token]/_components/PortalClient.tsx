'use client'

import { useState, useTransition } from 'react'
import { approveEstimateByToken, rejectEstimateByToken, approveChangeOrderByToken, rejectChangeOrderByToken } from '@/lib/actions/portal'
import { CheckCircle, XCircle, FileText, Receipt, Clock, FileEdit } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'

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
  }
  lineItems: LineItem[]
}

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

export function PortalClient({ token, data, photos = [] }: { token: string; data: PortalData; photos?: PortalPhoto[] }) {
  const [isPending, startTransition] = useTransition()
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null)
  const [showSignature, setShowSignature] = useState(false)
  const [signedName, setSignedName] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isEstimate = data.type === 'estimate'
  const isChangeOrder = data.type === 'change_order'
  const isInvoice = data.type === 'invoice'
  const doc = isEstimate ? data.estimate : isChangeOrder ? data.changeOrder : data.invoice
  const lineItems = data.lineItems
  const statusColors = isEstimate || isChangeOrder ? ESTIMATE_STATUS_COLORS : INVOICE_STATUS_COLORS
  const docLabel = isChangeOrder ? 'Change Order' : isEstimate ? 'Estimate' : 'Invoice'

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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center">
            {isChangeOrder ? <FileEdit size={18} className="text-white" /> : isEstimate ? <FileText size={18} className="text-white" /> : <Receipt size={18} className="text-white" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {docLabel} {doc.number}
            </h1>
            <p className="text-sm text-slate-500">For {'clientName' in doc ? doc.clientName : ''}</p>
          </div>
        </div>

        {/* Action done state */}
        {actionDone && (
          <div className={`rounded-xl p-5 mb-6 flex items-center gap-4 ${actionDone === 'approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {actionDone === 'approved'
              ? <CheckCircle size={24} className="text-emerald-600 shrink-0" />
              : <XCircle size={24} className="text-red-500 shrink-0" />
            }
            <div>
              <p className={`font-semibold ${actionDone === 'approved' ? 'text-emerald-800' : 'text-red-700'}`}>
                {actionDone === 'approved' ? 'Estimate approved!' : 'Estimate rejected'}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">
                {actionDone === 'approved'
                  ? 'The contractor has been notified and will be in touch soon.'
                  : 'The contractor has been notified.'}
              </p>
            </div>
          </div>
        )}

        {/* Document card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-5">
          {/* Status + meta */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[doc.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {doc.status}
            </span>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              {isEstimate && data.estimate.validUntil && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Valid until {new Date(data.estimate.validUntil).toLocaleDateString()}
                </span>
              )}
              {isInvoice && data.type === 'invoice' && data.invoice.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  Due {new Date(data.invoice.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 pt-5 pb-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2">Description</th>
                  <th className="text-right pb-2 w-16">Qty</th>
                  <th className="text-right pb-2 w-24">Unit price</th>
                  <th className="text-right pb-2 w-24">Total</th>
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
              <span>Subtotal</span>
              <span>${parseFloat(doc.subtotal).toFixed(2)}</span>
            </div>
            {parseFloat(doc.tax) > 0 && (
              <div className="flex justify-between text-sm text-slate-500">
                <span>Tax</span>
                <span>${parseFloat(doc.tax).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
              <span>Total</span>
              <span>${parseFloat(doc.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {doc.notes && (
            <div className="px-6 pb-5">
              <p className="text-xs text-slate-400 mb-1">Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-line">{doc.notes}</p>
            </div>
          )}
        </div>

        {/* Estimate CTA buttons */}
        {(isEstimate || isChangeOrder) && !actionDone && (doc.status === 'sent' || doc.status === 'draft') && !showSignature && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowSignature(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              Approve {isChangeOrder ? 'change order' : 'estimate'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isPending}
              className="px-6 py-3 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {/* Reject modal with reason */}
        {showRejectModal && (
          <div className="space-y-4 p-4 bg-red-50 rounded-xl">
            <h3 className="font-semibold text-slate-800 text-sm">Decline this estimate</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Let the contractor know why you're declining..."
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
                {isPending ? 'Processing...' : 'Confirm Decline'}
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason('') }}
                className="px-6 py-3 rounded-xl text-sm border border-slate-200 text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showSignature && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
            <h3 className="font-semibold text-slate-800 text-sm">Sign to approve</h3>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Your name</label>
              <input type="text" value={signedName} onChange={e => setSignedName(e.target.value)} placeholder="Full name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <SignaturePad onSave={setSignatureData} onClear={() => setSignatureData(null)} />
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={isPending || !signatureData || !signedName.trim()} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                {isPending ? 'Processing...' : 'Sign & Approve'}
              </button>
              <button onClick={() => { setShowSignature(false); setSignatureData(null); setSignedName('') }} className="px-6 py-3 rounded-xl text-sm border border-slate-200 text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3">Photos ({photos.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <img key={p.id} src={p.url} alt={p.description || 'Photo'} className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-300 mt-8">Powered by WorkPilot</p>
      </div>
    </div>
  )
}
