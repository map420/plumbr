'use client'

import { useState, useTransition, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateInvoice, sendInvoiceToClient } from '@/lib/actions/invoices'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BottomSheet } from '@/components/BottomSheet'
import { Toast } from '@/components/Toast'
import { Printer, Send, Loader2, Eye, Smartphone, DollarSign, X, Mail, Link2, Copy, Check, ChevronLeft, MoreHorizontal } from 'lucide-react'
import { getPaymentsByInvoice, recordPayment } from '@/lib/actions/payments'
import { updateInvoice as updateInvoiceAction } from '@/lib/actions/invoices'
import { sendInvoiceSms } from '@/lib/actions/sms'
import {
  DocHero, DocMeta,
  DetailSidebar, SideCard,
  TotalsCard,
  TimelineList,
  StatusPill, ClientAvatar,
  type StatusTone, type TimelineItem,
} from '@/components/ui'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Invoice = { id: string; number: string; clientName: string; clientEmail: string | null; status: string; subtotal: string; tax: string; total: string; dueDate: Date | null; paidAt: Date | null; notes: string | null; reminderSentAt?: Date | null; createdAt?: Date }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; markAsPaid: string; print: string; status: Record<InvoiceStatus, string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

type PaymentRecord = { id: string; amount: string; method: string; referenceNumber?: string | null; paidAt?: string | Date | null }

const STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: 'draft',
  sent: 'sent',
  paid: 'paid',
  overdue: 'overdue',
  cancelled: 'declined',
}

const TYPE_CHIP_CLASS: Record<LineItemType, string> = {
  labor: 'wp-type-chip wp-type-chip--labor',
  material: 'wp-type-chip wp-type-chip--material',
  subcontractor: 'wp-type-chip wp-type-chip--subcontractor',
  other: 'wp-type-chip wp-type-chip--other',
}

function effectiveStatus(inv: Invoice): InvoiceStatus {
  if (inv.status === 'sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue'
  return inv.status as InvoiceStatus
}

export function InvoiceDetailClient({ invoice, lineItems, viewCount = 0, clientPhone = null, shareToken = null, translations: t }: { invoice: Invoice; lineItems: LineItem[]; viewCount?: number; clientPhone?: string | null; shareToken?: string | null; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [currentShareToken] = useState(shareToken)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('card')
  const [payRef, setPayRef] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const status = effectiveStatus(invoice)

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const remaining = parseFloat(invoice.total) - totalPaid
  const paidPercent = parseFloat(invoice.total) > 0 ? (totalPaid / parseFloat(invoice.total)) * 100 : 0

  const portalUrl = currentShareToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/en/portal/${currentShareToken}` : null

  // Load payments once on mount (so desktop payment progress + sidebar timeline can show real data)
  useEffect(() => {
    getPaymentsByInvoice(invoice.id).then(setPayments).catch(() => {})
  }, [invoice.id])

  useEffect(() => {
    if (showPaymentModal) {
      setPayAmount(remaining > 0 ? remaining.toFixed(2) : '')
    }
  }, [showPaymentModal]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payAmount || parseFloat(payAmount) <= 0) return
    setIsRecording(true)
    try {
      await recordPayment({
        invoiceId: invoice.id,
        type: 'partial',
        amount: parseFloat(payAmount),
        method: payMethod as 'card' | 'ach' | 'check' | 'cash',
        referenceNumber: payRef || undefined,
      })
      const updated = await getPaymentsByInvoice(invoice.id)
      setPayments(updated)
      setShowPayForm(false)
      setPayRef('')
      const newTotal = updated.reduce((s: number, p: PaymentRecord) => s + parseFloat(p.amount), 0)
      if (newTotal >= parseFloat(invoice.total)) {
        await updateInvoiceAction(invoice.id, { status: 'paid', paidAt: new Date().toISOString() })
        setShowPaymentModal(false)
        window.location.reload()
        return
      }
      setPayAmount((parseFloat(invoice.total) - newTotal).toFixed(2))
    } finally { setIsRecording(false) }
  }

  async function handleSendSms() {
    setIsSendingSms(true)
    try {
      const result = await sendInvoiceSms(invoice.id)
      if (!result.success) alert(result.error || 'SMS failed')
    } catch (err: unknown) {
      alert('SMS failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally { setIsSendingSms(false) }
  }

  function handleSend() {
    setIsSending(true)
    setShowEmailModal(false)
    startTransition(async () => {
      const result = await sendInvoiceToClient(invoice.id)
      setIsSending(false)
      if (result.sent) {
        setToast(`Invoice sent to ${invoice.clientEmail}`)
        window.location.reload()
      } else {
        setToast(result.error ?? 'Could not send email.')
      }
    })
  }

  function handleStatusChange(newStatus: InvoiceStatus) {
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'paid' && !invoice.paidAt) update.paidAt = new Date().toISOString()
    startTransition(async () => { await updateInvoice(invoice.id, update); router.refresh() })
  }

  // Desktop timeline
  const timelineItems: TimelineItem[] = []
  if (invoice.paidAt) {
    timelineItems.push({
      tone: 'success',
      event: locale === 'es' ? 'Factura pagada' : 'Invoice paid',
      time: new Date(invoice.paidAt).toLocaleDateString(),
    })
  }
  payments.slice(0, 3).forEach(p => {
    timelineItems.push({
      tone: 'success',
      event: `$${parseFloat(p.amount).toFixed(2)} · ${p.method === 'card' ? 'Card / PayPal' : p.method === 'ach' ? 'ACH' : p.method === 'check' ? `Check${p.referenceNumber ? ' #' + p.referenceNumber : ''}` : 'Cash'}`,
      time: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—',
    })
  })
  if (viewCount > 0) {
    timelineItems.push({
      tone: 'info',
      event: locale === 'es' ? 'Cliente vió la factura' : 'Client viewed',
      time: `${viewCount}×`,
    })
  }
  if (invoice.reminderSentAt) {
    timelineItems.push({
      tone: 'warning',
      event: locale === 'es' ? 'Recordatorio enviado' : 'Reminder sent',
      time: new Date(invoice.reminderSentAt).toLocaleDateString(),
    })
  }
  timelineItems.push({
    tone: 'neutral',
    event: locale === 'es' ? 'Creada' : 'Created',
    time: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '—',
  })

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6" style={{ boxShadow: 'var(--wp-elevation-3)' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--wp-text)' }}>Send Invoice to {invoice.clientName}?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--wp-text-3)' }}>Email: <span style={{ color: 'var(--wp-text-2)', fontWeight: 500 }}>{invoice.clientEmail}</span></p>
            <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}>
              <p>Invoice <strong>{invoice.number}</strong> for <strong>${parseFloat(invoice.total).toFixed(2)}</strong>{invoice.dueDate ? ` — due ${new Date(invoice.dueDate).toLocaleDateString('en-US')}` : ''}.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEmailModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={handleSend} disabled={isSending} className="btn-primary btn-sm">
                {isSending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Mail size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal — logic preserved */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden" style={{ boxShadow: 'var(--wp-elevation-3)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--wp-text)' }}>Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ color: 'var(--wp-text-3)' }}><X size={18} /></button>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--wp-text-3)' }}>
                <span className="font-medium">PAID</span>
                <span className="font-medium">DUE ${remaining > 0 ? remaining.toFixed(2) : '0.00'}</span>
              </div>
              <div className="w-full h-6 rounded-full overflow-hidden mb-1" style={{ background: 'var(--wp-surface-2)' }}>
                <div className="h-full rounded-full flex items-center justify-center transition-all" style={{ width: `${Math.min(paidPercent, 100)}%`, background: 'var(--wp-success-v2)' }}>
                  {paidPercent > 15 && <span className="text-[10px] text-white font-semibold">${totalPaid.toFixed(2)} of ${parseFloat(invoice.total).toFixed(2)}</span>}
                </div>
              </div>
              {paidPercent <= 15 && <p className="text-xs mb-2" style={{ color: 'var(--wp-text-3)' }}>${totalPaid.toFixed(2)} of ${parseFloat(invoice.total).toFixed(2)}</p>}

              {!showPayForm ? (
                <button onClick={() => setShowPayForm(true)} className="w-full py-2.5 rounded-lg text-sm font-medium mt-3"
                  style={{ border: '1px solid var(--wp-success-v2)', color: 'var(--wp-success-v2)' }}>
                  Record New Payment
                </button>
              ) : (
                <form onSubmit={handleRecordPayment} className="mt-3 space-y-3 p-3 rounded-lg" style={{ background: 'var(--wp-surface-2)' }}>
                  <div>
                    <label className="text-xs" style={{ color: 'var(--wp-text-3)' }}>Amount</label>
                    <input type="number" step="0.01" min="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                      className="input text-sm mt-1" required />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: 'var(--wp-text-3)' }}>Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="input text-sm mt-1">
                      <option value="card">Credit Card or PayPal</option>
                      <option value="ach">ACH / Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  {payMethod === 'check' && (
                    <div>
                      <label className="text-xs" style={{ color: 'var(--wp-text-3)' }}>Check #</label>
                      <input value={payRef} onChange={e => setPayRef(e.target.value)} className="input text-sm mt-1" placeholder="Check number" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="submit" disabled={isRecording} className="btn-primary text-sm flex-1 disabled:opacity-50">
                      {isRecording ? 'Recording...' : 'Save Payment'}
                    </button>
                    <button type="button" onClick={() => setShowPayForm(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              )}

              {payments.length > 0 && (
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} style={{ color: 'var(--wp-text-3)' }} />
                        <span className="font-medium" style={{ color: 'var(--wp-text)' }}>${parseFloat(p.amount).toFixed(2)}</span>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending'}
                        {' / '}{p.method === 'card' ? 'Card / PayPal' : p.method === 'ach' ? 'ACH' : p.method === 'check' ? `Check${p.referenceNumber ? ' #' + p.referenceNumber : ''}` : 'Cash'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
        <div className="py-1">
          {clientPhone && (
            <button onClick={() => { setShowMoreMenu(false); handleSendSms() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text)' }}>
              <Smartphone size={18} style={{ color: 'var(--wp-text-3)' }} /> Send SMS
            </button>
          )}
          {portalUrl && (
            <button onClick={() => { setShowMoreMenu(false); navigator.clipboard.writeText(portalUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text)' }}>
              <Link2 size={18} style={{ color: 'var(--wp-text-3)' }} /> Copy Portal Link
            </button>
          )}
          {(status === 'sent' || status === 'overdue') && (
            <button onClick={() => { setShowMoreMenu(false); handleStatusChange('paid') }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-success-v2)' }}>
              <Check size={18} /> {t.markAsPaid}
            </button>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={showStatusMenu} onClose={() => setShowStatusMenu(false)} title="Change Status">
        <div className="py-1">
          {([
            { key: 'sent' as InvoiceStatus, label: locale === 'es' ? 'Enviada' : 'Sent', color: 'var(--wp-info-v2)' },
            { key: 'paid' as InvoiceStatus, label: locale === 'es' ? 'Pagada' : 'Paid', color: 'var(--wp-success-v2)' },
            { key: 'overdue' as InvoiceStatus, label: locale === 'es' ? 'Vencida' : 'Overdue', color: 'var(--wp-warning-v2)' },
            { key: 'cancelled' as InvoiceStatus, label: locale === 'es' ? 'Cancelada' : 'Cancelled', color: 'var(--wp-error-v2)' },
          ]).map(opt => (
            <button key={opt.key} onClick={() => { setShowStatusMenu(false); handleStatusChange(opt.key) }}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm"
              style={{ color: status === opt.key ? opt.color : 'var(--wp-text)' }}>
              <span style={{ fontWeight: status === opt.key ? 700 : 400 }}>{opt.label}</span>
              {status === opt.key && <Check size={16} style={{ color: opt.color }} />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ══════════════ MOBILE LAYOUT (preserved, v2 tokens via aliases) ══════════════ */}
      <div className="md:hidden bg-white min-h-full">
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button onClick={() => router.push(`/${locale}/invoices`)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Invoices
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text)', lineHeight: '1.25rem' }}>#{invoice.number.replace('INV-', '')}</span>
          <div className="flex-1 flex items-center justify-end" />
        </div>

        <div className="flex items-stretch" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <button onClick={() => invoice.clientEmail ? setShowEmailModal(true) : null} disabled={isSending || !invoice.clientEmail}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 disabled:opacity-30"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Send size={16} /> SEND
          </button>
          <button onClick={() => router.push(`/${locale}/invoices/${invoice.id}/print`)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Printer size={16} /> PRINT
          </button>
          <button onClick={() => setShowPaymentModal(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <DollarSign size={16} /> PAY
          </button>
          <button onClick={() => setShowMoreMenu(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <MoreHorizontal size={16} /> MORE
          </button>
        </div>

        <button onClick={() => setShowStatusMenu(true)} className="w-full flex items-center justify-center gap-1 py-1.5"
          style={{
            background: status === 'paid' ? 'var(--wp-success-bg-v2)' : status === 'sent' ? 'var(--wp-info-bg-v2)' : status === 'overdue' ? 'var(--wp-warning-bg-v2)' : status === 'cancelled' ? 'var(--wp-error-bg-v2)' : 'var(--wp-surface-2)',
            color: status === 'paid' ? 'var(--wp-success-v2)' : status === 'sent' ? 'var(--wp-info-v2)' : status === 'overdue' ? 'var(--wp-warning-v2)' : status === 'cancelled' ? 'var(--wp-error-v2)' : 'var(--wp-text-2)',
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
          {t.status[status]} <ChevronLeft size={12} className="rotate-[-90deg]" />
        </button>

        <div className="px-5 pt-4 pb-5">
          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wp-text)', marginBottom: '0.375rem' }}>Billed To</p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text)' }}>{invoice.clientName}</p>
            {invoice.clientEmail && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>{invoice.clientEmail}</p>}
            {clientPhone && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>{clientPhone}</p>}
          </div>

          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-3)' }}>Invoice #</span>
              <span style={{ color: 'var(--wp-text)' }}>{invoice.number.replace('INV-', '')}</span>
            </div>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-3)' }}>Date</span>
              <span style={{ color: 'var(--wp-text)' }}>{new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-3)' }}>Due Date</span>
                <span style={{ color: status === 'overdue' ? 'var(--wp-error-v2)' : 'var(--wp-text)' }}>{new Date(invoice.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-3)' }}>Paid On</span>
                <span style={{ color: 'var(--wp-success-v2)' }}>{new Date(invoice.paidAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
              </div>
            )}
            {viewCount > 0 && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-3)' }}>Client Activity</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--wp-success-v2)' }}>
                  <Eye size={11} /> Viewed {viewCount}x
                </span>
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '2px solid var(--wp-border-v2)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Description</span>
              <div className="flex gap-6">
                <span className="w-8 text-center">Qty</span>
                <span className="w-16 text-right">Total</span>
              </div>
            </div>
            {lineItems.map(li => (
              <div key={li.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                <div className="min-w-0 flex-1">
                  <span style={{ fontSize: '0.875rem', color: 'var(--wp-text)' }}>
                    <span className={TYPE_CHIP_CLASS[li.type as LineItemType] ?? TYPE_CHIP_CLASS.other} style={{ marginRight: '0.375rem' }}>
                      {t.lineItems.type[li.type as LineItemType]}
                    </span>
                    {li.description}
                  </span>
                </div>
                <div className="flex gap-6 shrink-0">
                  <span className="w-8 text-center" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>{parseFloat(li.quantity).toFixed(0)}</span>
                  <span className="w-16 text-right text-price" style={{ fontSize: '0.875rem', color: 'var(--wp-text)' }}>${parseFloat(li.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mb-6">
            <div style={{ width: '160px' }}>
              <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                <span>Subtotal</span><span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(invoice.tax) > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                  <span>Tax</span><span>${parseFloat(invoice.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '2px solid var(--wp-brand)', fontSize: '1rem', fontWeight: 700, color: 'var(--wp-text)' }}>
                <span>Total</span><span>${parseFloat(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Notes</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--wp-text-2)', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
            </div>
          )}

          {portalUrl && (
            <div className="mb-4">
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Client Portal</p>
              <div className="flex gap-2">
                <input type="text" readOnly value={portalUrl}
                  className="flex-1 rounded-lg px-3 py-2 text-xs select-all outline-none"
                  style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}
                  onFocus={e => e.target.select()} />
                <button onClick={() => { navigator.clipboard.writeText(portalUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                  className="btn-secondary btn-sm" style={{ minHeight: 'auto' }}>
                  {linkCopied ? <><Check size={12} style={{ color: 'var(--wp-success-v2)' }} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ DESKTOP LAYOUT (v2) ══════════════ */}
      <div className="hidden md:block p-8 max-w-6xl">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Invoices', href: `/${locale}/invoices` }, { label: invoice.number }]} />
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          <div>
            <DocHero
              title={invoice.number}
              sub={
                <>
                  {invoice.createdAt && (
                    <>{locale === 'es' ? 'Emitida' : 'Issued'} {new Date(invoice.createdAt).toLocaleDateString()}</>
                  )}
                  {invoice.dueDate && (
                    <>
                      {' · '}{locale === 'es' ? 'Vence' : 'Due'} {new Date(invoice.dueDate).toLocaleDateString()}
                    </>
                  )}
                </>
              }
              actions={
                <>
                  {(status === 'draft' || status === 'sent' || status === 'overdue') && invoice.clientEmail && (
                    <button onClick={() => setShowEmailModal(true)} disabled={isPending || isSending} className="btn-primary btn-sm">
                      {isSending ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Mail size={14} /> Email</>}
                    </button>
                  )}
                  <button onClick={() => setShowPaymentModal(true)} className="btn-sm"
                    style={{ background: 'var(--wp-success-v2)', color: 'white', borderRadius: 'var(--wp-radius-md)', padding: '0.375rem 0.75rem', fontWeight: 600, fontSize: '0.75rem' }}>
                    <DollarSign size={14} /> {locale === 'es' ? 'Cobrar' : 'Record Payment'}
                  </button>
                  {(status === 'sent' || status === 'overdue') && (
                    <button onClick={() => handleStatusChange('paid')} disabled={isPending} className="btn-ghost btn-sm"
                      style={{ color: 'var(--wp-success-v2)', minHeight: 'auto' }}>
                      <Check size={14} /> {t.markAsPaid}
                    </button>
                  )}
                  <div style={{ width: '1px', height: '20px', background: 'var(--wp-border-v2)', margin: '0 4px' }} />
                  {clientPhone && (
                    <button onClick={handleSendSms} disabled={isSendingSms} className="btn-ghost btn-sm" title="Send SMS" style={{ minHeight: 'auto' }}>
                      <Smartphone size={14} />
                    </button>
                  )}
                  <Link href={`/${locale}/invoices/${invoice.id}/print`} className="btn-ghost btn-sm" style={{ minHeight: 'auto' }} title={t.print}>
                    <Printer size={14} />
                  </Link>
                </>
              }
            >
              <DocMeta
                k="Status"
                v={<StatusPill tone={STATUS_TONE[status]}>{t.status[status]}</StatusPill>}
              />
              {viewCount > 0 && (
                <DocMeta
                  k={locale === 'es' ? 'Vistas' : 'Views'}
                  v={
                    <span style={{ color: 'var(--wp-success-v2)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={13} /> {viewCount}
                    </span>
                  }
                />
              )}
              {invoice.paidAt && (
                <DocMeta
                  k={locale === 'es' ? 'Pagada' : 'Paid on'}
                  v={
                    <span style={{ color: 'var(--wp-success-v2)', fontWeight: 500 }}>
                      {new Date(invoice.paidAt).toLocaleDateString()}
                    </span>
                  }
                />
              )}
              <DocMeta
                className="ml-auto text-right"
                k={locale === 'es' ? 'Total' : 'Total'}
                v={`$${parseFloat(invoice.total).toFixed(2)}`}
                total
              />
            </DocHero>

            {/* Payment progress */}
            {totalPaid > 0 && status !== 'paid' && (
              <div className="card mt-3 p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--wp-text-3)', letterSpacing: '0.08em' }}>
                    {locale === 'es' ? 'Progreso de pago' : 'Payment progress'}
                  </span>
                  <span className="text-xs tabular-nums font-medium" style={{ color: 'var(--wp-text-2)' }}>
                    {paidPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--wp-surface-3)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(paidPercent, 100)}%`, background: 'linear-gradient(90deg, #15803D, #22C55E)' }} />
                </div>
                <div className="flex items-baseline justify-between mt-2.5 text-xs">
                  <span className="flex items-center gap-1" style={{ color: 'var(--wp-success-v2)', fontWeight: 600 }}>
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'var(--wp-success-v2)' }} />
                    ${totalPaid.toFixed(2)} {locale === 'es' ? 'cobrado' : 'received'}
                  </span>
                  <span style={{ color: 'var(--wp-warning-v2)', fontWeight: 600 }}>
                    ${remaining.toFixed(2)} {locale === 'es' ? 'pendiente' : 'remaining'}
                    {invoice.dueDate && (
                      <span style={{ fontWeight: 400, marginLeft: '4px' }}>
                        · {locale === 'es' ? 'vence' : 'due'} {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Client card */}
            <div className="card mt-3 p-5">
              <div className="flex items-start gap-3">
                <ClientAvatar name={invoice.clientName} size="lg" />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--wp-text-3)' }}>
                    {locale === 'es' ? 'Facturado a' : 'Billed to'}
                  </div>
                  <div className="text-base font-semibold" style={{ color: 'var(--wp-text)' }}>{invoice.clientName}</div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--wp-text-3)' }}>
                    {invoice.clientEmail && <span>{invoice.clientEmail}</span>}
                    {clientPhone && <span>{clientPhone}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="card mt-3 overflow-hidden" style={{ padding: 0 }}>
              <div className="px-5 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--wp-border-v2)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Items' : 'Line items'}
                </h3>
                <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>{lineItems.length} {locale === 'es' ? 'items' : 'items'}</span>
              </div>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--wp-surface-2)' }}>
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>{t.lineItems.fields.description}</th>
                    <th className="text-center px-2 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)', width: '60px' }}>{t.lineItems.fields.quantity}</th>
                    <th className="text-right px-2 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)', width: '90px' }}>{t.lineItems.fields.unitPrice}</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)', width: '100px' }}>{t.lineItems.fields.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(li => (
                    <tr key={li.id} style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                      <td className="px-5 py-3">
                        <span className={TYPE_CHIP_CLASS[li.type as LineItemType] ?? TYPE_CHIP_CLASS.other}>
                          {t.lineItems.type[li.type as LineItemType]}
                        </span>
                        <div className="mt-1" style={{ color: 'var(--wp-text)' }}>{li.description}</div>
                      </td>
                      <td className="px-2 py-3 text-center" style={{ color: 'var(--wp-text-3)' }}>{li.quantity}</td>
                      <td className="px-2 py-3 text-right tabular-nums" style={{ color: 'var(--wp-text-3)' }}>${parseFloat(li.unitPrice).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${parseFloat(li.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invoice.notes && (
              <div className="card mt-3 p-5 text-sm">
                <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--wp-text-3)' }}>
                  {t.fields.notes || 'Notes'}
                </div>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--wp-text-2)', lineHeight: 1.6 }}>{invoice.notes}</p>
              </div>
            )}

            {invoice.dueDate && (status === 'sent' || status === 'overdue') && (
              <div className="card mt-3 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: invoice.reminderSentAt ? 'var(--wp-success-v2)' : status === 'overdue' ? 'var(--wp-error-v2)' : 'var(--wp-info-v2)' }} />
                  <span className="text-xs" style={{ color: 'var(--wp-text-2)' }}>
                    {(() => {
                      const due = new Date(invoice.dueDate!)
                      const now = new Date()
                      const reminderDate = new Date(due)
                      reminderDate.setDate(reminderDate.getDate() - 3)
                      if (invoice.reminderSentAt) return `Reminder sent on ${new Date(invoice.reminderSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      if (now > due) return `Overdue — notification sent to ${invoice.clientEmail}`
                      if (now >= reminderDate) return `Reminder being sent to ${invoice.clientEmail} today`
                      return `Automatic reminder on ${reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (3 days before due)`
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <DetailSidebar>
            <TotalsCard
              label={locale === 'es' ? 'Total' : 'Total amount'}
              total={`$${parseFloat(invoice.total).toFixed(2)}`}
              rows={[
                { k: 'Subtotal', v: `$${parseFloat(invoice.subtotal).toFixed(2)}` },
                { k: 'Tax', v: `$${parseFloat(invoice.tax).toFixed(2)}` },
                ...(totalPaid > 0 ? [
                  { k: locale === 'es' ? 'Pagado' : 'Paid', v: `−$${totalPaid.toFixed(2)}`, emphasis: true },
                  { k: locale === 'es' ? 'Pendiente' : 'Balance', v: `$${remaining.toFixed(2)}` },
                ] : []),
              ]}
            />

            <SideCard label={locale === 'es' ? 'Actividad' : 'Activity'}>
              <TimelineList items={timelineItems} />
            </SideCard>

            {/* Payments received */}
            {payments.length > 0 && (
              <SideCard label={locale === 'es' ? 'Pagos recibidos' : 'Payments received'}>
                <div className="flex flex-col gap-2">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--wp-success-v2)' }} />
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--wp-text)' }}>${parseFloat(p.amount).toFixed(2)}</span>
                      <span className="capitalize" style={{ color: 'var(--wp-text-3)' }}>via {p.method}</span>
                      {p.paidAt && <span className="ml-auto" style={{ color: 'var(--wp-text-3)' }}>{new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowPaymentModal(true)} className="w-full mt-3 text-xs font-semibold py-1.5 rounded-md" style={{ color: 'var(--wp-brand)', background: 'var(--wp-surface-2)', border: '1px solid var(--wp-border-v2)' }}>
                  + {locale === 'es' ? 'Registrar pago manual' : 'Record manual payment'}
                </button>
              </SideCard>
            )}

            {/* Send reminder */}
            {(status === 'sent' || status === 'overdue') && (
              <SideCard label={locale === 'es' ? 'Enviar recordatorio' : 'Send reminder'}>
                <div className="flex gap-1.5">
                  {invoice.clientEmail && (
                    <button onClick={() => setShowEmailModal(true)} disabled={isSending} className="flex-1 btn-secondary btn-sm" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem' }}>
                      <Mail size={12} /> Email
                    </button>
                  )}
                  {clientPhone && (
                    <button onClick={handleSendSms} disabled={isSendingSms} className="flex-1 btn-secondary btn-sm" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem' }}>
                      <Smartphone size={12} /> SMS
                    </button>
                  )}
                  <Link href={`/${locale}/assistant?msg=${encodeURIComponent(`Draft a payment reminder for ${invoice.clientName} about invoice ${invoice.number} for $${parseFloat(invoice.total).toFixed(2)}`)}`}
                    className="flex-1 btn-secondary btn-sm flex items-center justify-center gap-1" style={{ minHeight: 'auto', padding: '6px 8px', fontSize: '0.6875rem', color: 'var(--wp-brand)' }}>
                    ◆ AI draft
                  </Link>
                </div>
              </SideCard>
            )}

            {portalUrl && (
              <SideCard label={locale === 'es' ? 'Portal del cliente' : 'Client portal'}>
                <div className="rounded-md px-2.5 py-2 text-xs font-mono break-all" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)', border: '1px solid var(--wp-border-v2)' }}>
                  {portalUrl}
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  <button onClick={() => { navigator.clipboard.writeText(portalUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                    className="btn-secondary btn-sm flex-1" style={{ minHeight: 'auto', padding: '6px 10px' }}>
                    {linkCopied ? <><Check size={12} style={{ color: 'var(--wp-success-v2)' }} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <Link href={portalUrl} target="_blank" className="btn-secondary btn-sm flex-1" style={{ minHeight: 'auto', padding: '6px 10px' }}>
                    <Link2 size={12} /> Open
                  </Link>
                </div>
              </SideCard>
            )}
          </DetailSidebar>
        </div>
      </div>
    </>
  )
}
