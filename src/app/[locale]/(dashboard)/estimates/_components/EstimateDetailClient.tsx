'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteEstimate, updateEstimate, resendEstimateEmail } from '@/lib/actions/estimates'
import { createInvoice } from '@/lib/actions/invoices'
import { createShoppingListFromEstimate } from '@/lib/actions/shopping-lists'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BottomSheet } from '@/components/BottomSheet'
import { Edit, Trash2, ArrowRight, Loader2, Briefcase, Eye, Smartphone, Mail, FileText, Link2, Copy, Check, ChevronLeft, MoreHorizontal, Printer, DollarSign, Send, ShoppingCart } from 'lucide-react'
import { sendEstimateSms } from '@/lib/actions/sms'
import {
  DocHero, DocMeta,
  DetailSidebar, SideCard,
  TotalsCard,
  TimelineList,
  StatusPill, ClientAvatar,
  type StatusTone, type TimelineItem,
} from '@/components/ui'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Estimate = { id: string; number: string; jobId: string | null; clientName: string; clientEmail: string | null; clientPhone?: string | null; status: string; subtotal: string; tax: string; total: string; validUntil: Date | null; notes: string | null; shareToken?: string | null; createdAt?: Date }
type CompanyInfo = { name: string; phone: string | null; email: string | null; logoUrl: string | null; businessTaxId: string | null }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; edit: string; delete: string; convertToInvoice: string; status: Record<EstimateStatus, string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

const STATUS_TONE: Record<EstimateStatus, StatusTone> = {
  draft: 'draft',
  sent: 'sent',
  approved: 'approved',
  rejected: 'rejected',
  converted: 'converted',
}

const TYPE_CHIP_CLASS: Record<LineItemType, string> = {
  labor: 'wp-type-chip wp-type-chip--labor',
  material: 'wp-type-chip wp-type-chip--material',
  subcontractor: 'wp-type-chip wp-type-chip--subcontractor',
  other: 'wp-type-chip wp-type-chip--other',
}

function CompanyHeader({ company }: { company: CompanyInfo }) {
  const [logoError, setLogoError] = useState(false)
  const isImageUrl = company.logoUrl && /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(company.logoUrl)
  const showLogo = isImageUrl && !logoError

  return (
    <div className="flex items-start gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
      {showLogo ? (
        <img src={company.logoUrl!} alt="" className="w-12 h-12 rounded-lg object-contain shrink-0" onError={() => setLogoError(true)} />
      ) : (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--wp-brand)' }}>
          <span style={{ color: 'white', fontSize: '1rem', fontWeight: 800 }}>
            {company.name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <div>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text)', lineHeight: 1.2 }}>{company.name}</p>
        {company.phone && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-3)', marginTop: '0.25rem' }}>Phone: {company.phone}</p>}
        {company.email && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-3)' }}>Email: {company.email}</p>}
        {company.businessTaxId && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-3)' }}>Tax #: {company.businessTaxId}</p>}
      </div>
    </div>
  )
}

type PhotoItem = { id: string; url: string; description: string | null; thumbnailUrl: string | null }

export function EstimateDetailClient({ estimate, lineItems, job, viewCount = 0, clientPhone = null, shareToken: initialShareToken = null, photos = [], company, translations: t }: { estimate: Estimate; lineItems: LineItem[]; job: { id: string; name: string } | null; viewCount?: number; clientPhone?: string | null; shareToken?: string | null; photos?: PhotoItem[]; company?: CompanyInfo; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isPending, startTransition] = useTransition()
  const [isConverting, setIsConverting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [currentShareToken, setCurrentShareToken] = useState<string | null>(initialShareToken)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [isGeneratingList, setIsGeneratingList] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const hasMaterialItems = lineItems.some(li => li.type === 'material' && li.description?.trim().length)

  function handleGenerateShoppingList() {
    if (!hasMaterialItems || isGeneratingList) return
    setIsGeneratingList(true)
    setGenerateError(null)
    startTransition(async () => {
      try {
        const result = await createShoppingListFromEstimate(estimate.id)
        if (result.created && result.list) {
          router.push(`/${locale}/shopping-list/${result.list.id}`)
        } else {
          setGenerateError('No material items in this estimate.')
        }
      } catch (err) {
        setGenerateError((err as Error)?.message ?? 'Could not create shopping list.')
      } finally {
        setIsGeneratingList(false)
      }
    })
  }

  const status = estimate.status as EstimateStatus
  const portalUrl = currentShareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/en/portal/${currentShareToken}`
    : null

  async function handleCopyLink() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function handleSendEmail() {
    setIsSendingEmail(true)
    setEmailSent(false)
    setShowEmailModal(false)
    try {
      const result = await resendEstimateEmail(estimate.id)
      setEmailSent(true)
      if (result.shareToken) setCurrentShareToken(result.shareToken)
      window.location.reload()
    } catch (err: unknown) {
      alert('Failed to send: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleSendSms() {
    setIsSendingSms(true)
    try {
      const result = await sendEstimateSms(estimate.id, clientPhone!)
      if (!result.success) alert(result.error || 'SMS failed')
    } catch (err: unknown) {
      alert('SMS failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsSendingSms(false)
    }
  }

  function handleDelete() {
    startTransition(async () => { await deleteEstimate(estimate.id); router.push(`/${locale}/estimates`) })
  }

  function handleConvert() {
    setIsConverting(true)
    startTransition(async () => {
      try {
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)
        const invoice = await createInvoice(
          { jobId: estimate.jobId ?? '', estimateId: estimate.id, clientName: estimate.clientName, clientEmail: estimate.clientEmail ?? '', status: 'draft', subtotal: parseFloat(estimate.subtotal), tax: parseFloat(estimate.tax), total: parseFloat(estimate.total), dueDate: dueDate.toISOString(), notes: estimate.notes ?? '' },
          lineItems.map((li) => ({ type: li.type, description: li.description, quantity: parseFloat(li.quantity), unitPrice: parseFloat(li.unitPrice), total: parseFloat(li.total) }))
        )
        await updateEstimate(estimate.id, { status: 'converted', convertedToInvoiceId: invoice.id })
        router.push(`/${locale}/invoices/${invoice.id}`)
      } finally {
        setIsConverting(false)
      }
    })
  }

  // Desktop timeline items (synthesized from estimate metadata)
  const timelineItems: TimelineItem[] = []
  if (viewCount > 0) {
    timelineItems.push({
      tone: 'success',
      event: locale === 'es' ? 'Cliente vió el estimate' : 'Client viewed',
      time: `${viewCount}× · ${locale === 'es' ? 'última vez' : 'last seen'}`,
    })
  }
  if (status === 'sent' || status === 'approved' || status === 'rejected' || status === 'converted') {
    timelineItems.push({
      tone: 'info',
      event: locale === 'es' ? 'Email enviado al cliente' : 'Email sent',
      time: estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : '—',
    })
  }
  timelineItems.push({
    tone: 'neutral',
    event: locale === 'es' ? 'Creado' : 'Created',
    time: estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : '—',
  })

  return (
    <>
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Estimate"
          message={`Are you sure you want to delete ${estimate.number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--wp-text)' }}>Send to {estimate.clientName}?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--wp-text-3)' }}>Email: <span style={{ color: 'var(--wp-text-2)', fontWeight: 500 }}>{estimate.clientEmail}</span></p>
            <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}>
              <p>Estimate <strong>{estimate.number}</strong> for <strong>${parseFloat(estimate.total).toFixed(2)}</strong>{estimate.validUntil ? ` — valid until ${new Date(estimate.validUntil).toLocaleDateString('en-US')}` : ''}.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEmailModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button onClick={handleSendEmail} disabled={isSendingEmail} className="btn-primary btn-sm">
                {isSendingEmail ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* More menu bottom sheet (mobile) */}
      <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
        <div className="py-1">
          <Link href={`/${locale}/estimates/${estimate.id}/edit`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text)' }}>
            <Edit size={18} style={{ color: 'var(--wp-text-3)' }} /> {t.edit}
          </Link>
          {clientPhone && (
            <button onClick={() => { setShowMoreMenu(false); handleSendSms() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text)' }}>
              <Smartphone size={18} style={{ color: 'var(--wp-text-3)' }} /> Send SMS
            </button>
          )}
          {portalUrl && (
            <button onClick={() => { setShowMoreMenu(false); handleCopyLink() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text)' }}>
              <Link2 size={18} style={{ color: 'var(--wp-text-3)' }} /> Copy Portal Link
            </button>
          )}
          <button onClick={() => { setShowMoreMenu(false); setShowDeleteModal(true) }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-error-v2)' }}>
            <Trash2 size={18} /> {t.delete}
          </button>
        </div>
      </BottomSheet>

      {/* ══════════════ MOBILE LAYOUT (Joist-style, preserved) ══════════════ */}
      <div className="md:hidden bg-white min-h-full">

        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button onClick={() => router.push(`/${locale}/estimates`)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Estimates
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text)', lineHeight: '1.25rem' }}>#{estimate.number.replace('EST-', '')}</span>
          <div className="flex-1 flex items-center justify-end">
            <Link href={`/${locale}/estimates/${estimate.id}/edit`}
              className="flex items-center"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-brand)', lineHeight: '1.25rem' }}>
              Edit
            </Link>
          </div>
        </div>

        <div className="flex items-stretch" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <button onClick={() => estimate.clientEmail ? setShowEmailModal(true) : null} disabled={isSendingEmail || !estimate.clientEmail}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 disabled:opacity-30"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Send size={16} />
            SEND
          </button>
          <button onClick={() => router.push(`/${locale}/estimates/${estimate.id}/print`)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Printer size={16} />
            PRINT
          </button>
          <button onClick={status === 'approved' || status === 'sent' ? handleConvert : undefined}
            disabled={isConverting || (status !== 'approved' && status !== 'sent')}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 disabled:opacity-30"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {isConverting ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
            INVOICE
          </button>
          <button onClick={() => setShowMoreMenu(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-2)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <MoreHorizontal size={16} />
            MORE
          </button>
        </div>

        <button onClick={() => setShowStatusMenu(true)} className="w-full flex items-center justify-center gap-1 py-1.5"
          style={{
            background: status === 'approved' ? 'var(--wp-success-bg-v2)' : status === 'sent' ? 'var(--wp-info-bg-v2)' : status === 'rejected' ? 'var(--wp-error-bg-v2)' : status === 'converted' ? 'var(--wp-purple-bg)' : 'var(--wp-surface-2)',
            color: status === 'approved' ? 'var(--wp-success-v2)' : status === 'sent' ? 'var(--wp-info-v2)' : status === 'rejected' ? 'var(--wp-error-v2)' : status === 'converted' ? 'var(--wp-purple)' : 'var(--wp-text-2)',
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
          {t.status[status]} <ChevronLeft size={12} className="rotate-[-90deg]" />
        </button>

        <BottomSheet open={showStatusMenu} onClose={() => setShowStatusMenu(false)} title="Change Status">
          <div className="py-1">
            {([
              { key: 'sent' as EstimateStatus, label: locale === 'es' ? 'Pendiente' : 'Pending', color: 'var(--wp-info-v2)' },
              { key: 'approved' as EstimateStatus, label: locale === 'es' ? 'Aprobado' : 'Approved', color: 'var(--wp-success-v2)' },
              { key: 'rejected' as EstimateStatus, label: locale === 'es' ? 'Rechazado' : 'Declined', color: 'var(--wp-error-v2)' },
            ]).map(opt => (
              <button key={opt.key} onClick={() => {
                setShowStatusMenu(false)
                startTransition(async () => {
                  if (opt.key === 'sent') await resendEstimateEmail(estimate.id)
                  else await updateEstimate(estimate.id, { status: opt.key })
                  window.location.reload()
                })
              }}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm"
                style={{ color: status === opt.key ? opt.color : 'var(--wp-text)' }}>
                <span style={{ fontWeight: status === opt.key ? 700 : 400 }}>{opt.label}</span>
                {status === opt.key && <Check size={16} style={{ color: opt.color }} />}
              </button>
            ))}
          </div>
        </BottomSheet>

        <div className="px-5 pt-4 pb-5">
          {company && <CompanyHeader company={company} />}

          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wp-text)', marginBottom: '0.375rem' }}>Prepared For</p>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text)' }}>{estimate.clientName}</p>
                {estimate.clientEmail && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>{estimate.clientEmail}</p>}
                {clientPhone && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-3)' }}>{clientPhone}</p>}
              </div>
              {job && (
                <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md"
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-brand)', background: 'var(--wp-brand-subtle)' }}>
                  <Briefcase size={10} /> Job →
                </Link>
              )}
            </div>
          </div>

          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-3)' }}>Estimate #</span>
              <span style={{ color: 'var(--wp-text)' }}>{estimate.number.replace('EST-', '')}</span>
            </div>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-3)' }}>Date</span>
              <span style={{ color: 'var(--wp-text)' }}>{new Date(estimate.createdAt || Date.now()).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
            </div>
            {company?.businessTaxId && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-3)' }}>Business / Tax #</span>
                <span style={{ color: 'var(--wp-text)' }}>{company.businessTaxId}</span>
              </div>
            )}
            {estimate.validUntil && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-3)' }}>Valid Until</span>
                <span style={{ color: 'var(--wp-text)' }}>{new Date(estimate.validUntil).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
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
                <span>Subtotal</span><span>${parseFloat(estimate.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(estimate.tax) > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                  <span>Tax</span><span>${parseFloat(estimate.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '2px solid var(--wp-brand)', fontSize: '1rem', fontWeight: 700, color: 'var(--wp-text)' }}>
                <span>Total</span><span>${parseFloat(estimate.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {estimate.notes && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Notes</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--wp-text-2)', whiteSpace: 'pre-wrap' }}>{estimate.notes}</p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Photos ({photos.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map(p => (
                  <img key={p.id} src={p.thumbnailUrl || p.url} alt={p.description || ''} className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
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
                <button onClick={handleCopyLink} className="btn-secondary btn-sm" style={{ minHeight: 'auto' }}>
                  {linkCopied ? <><Check size={12} style={{ color: 'var(--wp-success-v2)' }} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ DESKTOP LAYOUT (v2 refactored) ══════════════ */}
      <div className="hidden md:block p-8 max-w-6xl">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Estimates', href: `/${locale}/estimates` }, { label: estimate.number }]} />
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          <div>
            {/* Hero card */}
            <DocHero
              title={estimate.number}
              sub={
                <>
                  {estimate.createdAt && (
                    <>
                      {locale === 'es' ? 'Creado' : 'Issued'} {new Date(estimate.createdAt).toLocaleDateString()}
                    </>
                  )}
                  {estimate.validUntil && (
                    <>
                      {' · '}{locale === 'es' ? 'Válido hasta' : 'Valid until'} {new Date(estimate.validUntil).toLocaleDateString()}
                    </>
                  )}
                </>
              }
              actions={
                <>
                  {estimate.clientEmail && (
                    <button onClick={() => setShowEmailModal(true)} disabled={isSendingEmail} className="btn-primary btn-sm">
                      <Mail size={14} /> {isSendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email'}
                    </button>
                  )}
                  {(status === 'approved' || status === 'sent') && (
                    <button onClick={handleConvert} disabled={isPending || isConverting} className="btn-sm" style={{ background: 'var(--wp-purple)', color: 'white', borderRadius: 'var(--wp-radius-md)', padding: '0.375rem 0.75rem', fontWeight: 600, fontSize: '0.75rem' }}>
                      {isConverting ? <><Loader2 size={14} className="animate-spin" /> Converting...</> : <><ArrowRight size={14} /> {t.convertToInvoice}</>}
                    </button>
                  )}
                  <div style={{ width: '1px', height: '20px', background: 'var(--wp-border-v2)', margin: '0 4px' }} />
                  {hasMaterialItems && (
                    <button onClick={handleGenerateShoppingList} disabled={isGeneratingList} className="btn-ghost btn-sm" title="Create a shopping list from material line items" style={{ minHeight: 'auto' }}>
                      {isGeneratingList ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                    </button>
                  )}
                  <Link href={`/${locale}/estimates/${estimate.id}/print`} className="btn-ghost btn-sm" style={{ minHeight: 'auto' }} title="Print">
                    <FileText size={14} />
                  </Link>
                  <Link href={`/${locale}/estimates/${estimate.id}/edit`} className="btn-ghost btn-sm" style={{ minHeight: 'auto' }} title={t.edit}>
                    <Edit size={14} />
                  </Link>
                  <button onClick={() => setShowDeleteModal(true)} disabled={isPending} className="btn-ghost btn-sm hover:!text-red-500" style={{ minHeight: 'auto' }} title={t.delete}>
                    <Trash2 size={14} />
                  </button>
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
              {job && (
                <DocMeta
                  k="Job"
                  v={
                    <Link href={`/${locale}/jobs/${job.id}`} className="inline-flex items-center gap-1" style={{ color: 'var(--wp-brand)' }}>
                      <Briefcase size={12} />{job.name} →
                    </Link>
                  }
                />
              )}
              <DocMeta
                className="ml-auto text-right"
                k={locale === 'es' ? 'Total' : 'Total'}
                v={`$${parseFloat(estimate.total).toFixed(2)}`}
                total
              />
            </DocHero>

            {generateError && (
              <div className="mt-2 text-xs px-3 py-2 rounded-md" style={{ color: 'var(--wp-error-v2)', background: 'var(--wp-error-bg-v2)', border: '1px solid var(--wp-error-border)' }}>
                {generateError}
              </div>
            )}

            {/* Client card + Job link */}
            <div className="card mt-3 p-5">
              <div className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--wp-text-3)', letterSpacing: '0.08em' }}>
                {locale === 'es' ? 'Preparado para' : 'Prepared for'}
              </div>
              <div className="flex items-center gap-3">
                <ClientAvatar name={estimate.clientName} size="lg" />
                <div className="flex-1">
                  <div className="text-base font-semibold" style={{ color: 'var(--wp-text)' }}>{estimate.clientName}</div>
                  <div className="text-xs mt-0.5 flex flex-wrap gap-x-3" style={{ color: 'var(--wp-text-3)' }}>
                    {estimate.clientEmail && <span>{estimate.clientEmail}</span>}
                    {clientPhone && <span>{clientPhone}</span>}
                  </div>
                </div>
                {job && (
                  <Link href={`/${locale}/jobs/${job.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-brand)' }}>
                    <Briefcase size={12} /> {job.name} →
                  </Link>
                )}
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

            {estimate.notes && (
              <div className="card mt-3 p-5 text-sm">
                <div className="text-xs uppercase tracking-wide font-semibold mb-2" style={{ color: 'var(--wp-text-3)' }}>
                  {t.fields.notes || 'Notes'}
                </div>
                <p className="whitespace-pre-wrap" style={{ color: 'var(--wp-text-2)', lineHeight: 1.6 }}>{estimate.notes}</p>
              </div>
            )}

            {photos.length > 0 && (
              <div className="card mt-3 p-5">
                <div className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: 'var(--wp-text-3)' }}>
                  Photos ({photos.length})
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map(p => <img key={p.id} src={p.thumbnailUrl || p.url} alt={p.description || ''} className="w-full aspect-square object-cover rounded-lg" />)}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <DetailSidebar>
            <TotalsCard
              label={locale === 'es' ? 'Total' : 'Total amount'}
              total={`$${parseFloat(estimate.total).toFixed(2)}`}
              rows={[
                { k: 'Subtotal', v: `$${parseFloat(estimate.subtotal).toFixed(2)}` },
                { k: 'Tax', v: `$${parseFloat(estimate.tax).toFixed(2)}` },
              ]}
            />

            <SideCard label={locale === 'es' ? 'Actividad' : 'Activity'}>
              <TimelineList items={timelineItems} />
            </SideCard>

            {portalUrl && (
              <SideCard label={locale === 'es' ? 'Portal del cliente' : 'Client portal'}>
                <div className="rounded-md px-2.5 py-2 text-xs font-mono break-all" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)', border: '1px solid var(--wp-border-v2)' }}>
                  {portalUrl}
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  <button onClick={handleCopyLink} className="btn-secondary btn-sm flex-1" style={{ minHeight: 'auto', padding: '6px 10px' }}>
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
