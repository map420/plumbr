'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteEstimate, updateEstimate, resendEstimateEmail } from '@/lib/actions/estimates'
import { createInvoice } from '@/lib/actions/invoices'
import { createShoppingListFromEstimate } from '@/lib/actions/shopping-lists'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Toast } from '@/components/Toast'
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
import { deriveEstimateStatus } from '@/lib/status/derived'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Estimate = { id: string; number: string; jobId: string | null; clientName: string; clientEmail: string | null; clientPhone?: string | null; status: string; subtotal: string; tax: string; total: string; validUntil: Date | null; notes: string | null; shareToken?: string | null; createdAt?: Date; markupPercent?: string | null; discountType?: string | null; discountValue?: string | null; signatureDataUrl?: string | null; signedByName?: string | null; signedAt?: Date | null; depositType?: string | null; depositAmount?: string | null; depositPaid?: boolean | null; depositPaidAt?: Date | null; contractId?: string | null }
type CompanyInfo = { name: string; phone: string | null; email: string | null; logoUrl: string | null; businessTaxId: string | null }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; edit: string; delete: string; convertToInvoice: string; status: Record<EstimateStatus | 'expired', string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

const STATUS_TONE: Record<string, StatusTone> = {
  draft: 'draft',
  sent: 'sent',
  approved: 'approved',
  rejected: 'rejected',
  converted: 'converted',
  expired: 'warning',
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
          <span style={{ color: 'var(--wp-text-inverse)', fontSize: '1rem', fontWeight: 800 }}>
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

export function EstimateDetailClient({ estimate, lineItems, job, linkedInvoice = null, viewCount = 0, clientPhone = null, shareToken: initialShareToken = null, photos = [], company, userTaxRate = null, translations: t }: { estimate: Estimate; lineItems: LineItem[]; job: { id: string; name: string } | null; linkedInvoice?: { id: string; number: string } | null; viewCount?: number; clientPhone?: string | null; shareToken?: string | null; photos?: PhotoItem[]; company?: CompanyInfo; userTaxRate?: string | null; translations: T }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  // A1 — Source-of-truth para totales: sumar line items en render.
  // El campo `estimate.subtotal` puede estar stale si alguien mutó items fuera de
  // createEstimate/updateEstimate. Recompute aquí protege contra drift.
  const liveSubtotal = lineItems.reduce((s, li) => s + parseFloat(li.total), 0)
  const liveDiscountAmount = estimate.discountType === 'percent' && estimate.discountValue
    ? liveSubtotal * (parseFloat(estimate.discountValue) / 100)
    : estimate.discountType === 'fixed' && estimate.discountValue
      ? parseFloat(estimate.discountValue)
      : 0
  const liveMarkupAmount = estimate.markupPercent
    ? liveSubtotal * (parseFloat(estimate.markupPercent) / 100)
    : 0
  const liveTaxable = Math.max(liveSubtotal - liveDiscountAmount + liveMarkupAmount, 0)
  // Tax rate viene del user profile (configurado en Settings > Company). Fallback a 0 si no configurado.
  const taxRateDecimal = userTaxRate ? (parseFloat(userTaxRate) || 0) / 100 : 0
  const liveTax = Math.round(liveTaxable * taxRateDecimal * 100) / 100
  const liveTotal = Math.round((liveTaxable + liveTax) * 100) / 100
  const [isPending, startTransition] = useTransition()
  const [isConverting, setIsConverting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' } | null>(null)
  const notify = (message: string, variant: 'success' | 'error' | 'warning' = 'success') => setToast({ message, variant })
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
          notify(locale === 'es' ? 'Lista de compras creada' : 'Shopping list created')
          router.push(`/${locale}/shopping-list/${result.list.id}`)
        } else {
          setGenerateError('No material items in this estimate.')
          notify(locale === 'es' ? 'Sin items de material' : 'No material items', 'warning')
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? 'Could not create shopping list.'
        setGenerateError(msg)
        notify(msg, 'error')
      } finally {
        setIsGeneratingList(false)
      }
    })
  }

  const status = estimate.status as EstimateStatus
  const displayStatus = deriveEstimateStatus(estimate)
  const displayStatusLabel = (t.status as Record<string, string>)[displayStatus] ?? displayStatus
  const portalUrl = currentShareToken
    ? (typeof window !== 'undefined'
        ? `${window.location.origin}/${locale === 'es' ? 'es' : 'en'}/portal/${currentShareToken}`
        : '')
    : null

  async function handleCopyLink() {
    if (!portalUrl) return
    await navigator.clipboard.writeText(portalUrl)
    setLinkCopied(true)
    notify(locale === 'es' ? 'Link copiado' : 'Link copied')
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
      notify(locale === 'es' ? 'Email enviado' : 'Email sent')
      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      notify((locale === 'es' ? 'Error enviando email: ' : 'Failed to send email: ') + msg, 'error')
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleSendSms() {
    setIsSendingSms(true)
    try {
      const result = await sendEstimateSms(estimate.id, clientPhone!)
      if (!result.success) {
        notify(result.error || (locale === 'es' ? 'Error enviando SMS' : 'SMS failed'), 'error')
      } else {
        notify(locale === 'es' ? 'SMS enviado' : 'SMS sent')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      notify((locale === 'es' ? 'Error enviando SMS: ' : 'SMS failed: ') + msg, 'error')
    } finally {
      setIsSendingSms(false)
    }
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteEstimate(estimate.id)
      notify(locale === 'es' ? 'Estimate eliminado' : 'Estimate deleted')
      router.push(`/${locale}/estimates`)
    })
  }

  const [showConvertConfirm, setShowConvertConfirm] = useState(false)

  function handleConvert() {
    // A4 — Propagate markup + discount as explicit adjustment line items so the
    // invoice's stored totals preserve the estimate's total exactly.
    const baseSubtotal = lineItems.reduce((s, li) => s + parseFloat(li.total), 0)
    const markupPct = estimate.markupPercent ? parseFloat(estimate.markupPercent) : 0
    const markupAmount = baseSubtotal * (markupPct / 100)
    const discountValue = estimate.discountValue ? parseFloat(estimate.discountValue) : 0
    const discountAmount = estimate.discountType === 'percent'
      ? baseSubtotal * (discountValue / 100)
      : estimate.discountType === 'fixed' ? discountValue : 0

    const convertedItems: { type: string; description: string; quantity: number; unitPrice: number; total: number }[] = lineItems.map((li) => ({
      type: li.type,
      description: li.description,
      quantity: parseFloat(li.quantity),
      unitPrice: parseFloat(li.unitPrice),
      total: parseFloat(li.total),
    }))

    if (markupAmount > 0) {
      convertedItems.push({
        type: 'other',
        description: `Service markup (${markupPct.toFixed(1)}%)`,
        quantity: 1,
        unitPrice: Math.round(markupAmount * 100) / 100,
        total: Math.round(markupAmount * 100) / 100,
      })
    }
    if (discountAmount > 0) {
      const label = estimate.discountType === 'percent'
        ? `Discount (${discountValue.toFixed(1)}%)`
        : 'Discount'
      convertedItems.push({
        type: 'other',
        description: label,
        quantity: 1,
        unitPrice: -Math.round(discountAmount * 100) / 100,
        total: -Math.round(discountAmount * 100) / 100,
      })
    }

    setIsConverting(true)
    startTransition(async () => {
      try {
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30)
        const invoice = await createInvoice(
          // A4 — usar valores live (derivados de line items) en vez del campo estimate.subtotal stale
          { jobId: estimate.jobId ?? '', estimateId: estimate.id, clientName: estimate.clientName, clientEmail: estimate.clientEmail ?? '', status: 'draft', subtotal: liveSubtotal, tax: liveTax, total: liveTotal, dueDate: dueDate.toISOString(), notes: estimate.notes ?? '' },
          convertedItems,
        )
        await updateEstimate(estimate.id, { status: 'converted', convertedToInvoiceId: invoice.id })
        notify(locale === 'es' ? `Factura ${invoice.number} creada` : `Invoice ${invoice.number} created`)
        router.push(`/${locale}/invoices/${invoice.id}`)
      } catch (e) {
        notify((locale === 'es' ? 'Error al convertir: ' : 'Convert failed: ') + (e instanceof Error ? e.message : 'unknown'), 'error')
      } finally {
        setIsConverting(false)
        setShowConvertConfirm(false)
      }
    })
  }

  // Desktop timeline items (synthesized from estimate metadata), newest first.
  const timelineItems: TimelineItem[] = []
  if (status === 'approved' || status === 'converted') {
    const signedLabel = estimate.signedByName
      ? `${locale === 'es' ? 'Firmado por' : 'Signed by'} ${estimate.signedByName}`
      : (locale === 'es' ? 'Aprobado por el cliente' : 'Approved by client')
    timelineItems.push({
      tone: 'success',
      event: signedLabel,
      time: estimate.signedAt ? new Date(estimate.signedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : '—',
    })
  }
  if (status === 'rejected') {
    timelineItems.push({
      tone: 'danger',
      event: locale === 'es' ? 'Rechazado por el cliente' : 'Rejected by client',
      time: '—',
    })
  }
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
      time: estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : '—',
    })
  }
  timelineItems.push({
    tone: 'neutral',
    event: locale === 'es' ? 'Creado' : 'Created',
    time: estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : '—',
  })

  return (
    <>
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDone={() => setToast(null)} />
      )}
      {showDeleteModal && (
        <ConfirmModal
          title="Delete Estimate"
          message={`Are you sure you want to delete ${estimate.number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      {/* D3 — Convert to Invoice confirmation */}
      {showConvertConfirm && (
        <ConfirmModal
          title={locale === 'es' ? 'Crear invoice desde estimate' : 'Create invoice from estimate'}
          message={`${estimate.clientName} · ${estimate.number} — $${parseFloat(estimate.total).toFixed(2)}. ${locale === 'es' ? 'Se creará un invoice con vencimiento en 30 días. El estimate quedará marcado como Converted.' : 'An invoice will be created with a 30-day due date. The estimate will be marked Converted.'}`}
          confirmText={locale === 'es' ? 'Crear invoice' : 'Create invoice'}
          tone="primary"
          onConfirm={handleConvert}
          onCancel={() => setShowConvertConfirm(false)}
        />
      )}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--wp-text)' }}>Send to {estimate.clientName}?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--wp-text-3)' }}>Email: <span style={{ color: 'var(--wp-text-2)', fontWeight: 500 }}>{estimate.clientEmail}</span></p>
            <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}>
              <p>Estimate <strong>{estimate.number}</strong> for <strong>${parseFloat(estimate.total).toFixed(2)}</strong>{estimate.validUntil ? ` — valid until ${new Date(estimate.validUntil).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}` : ''}.</p>
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
      <div className="md:hidden bg-card min-h-full">

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
          <button onClick={status === 'approved' || status === 'sent' ? () => setShowConvertConfirm(true) : undefined}
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
            background: displayStatus === 'approved' ? 'var(--wp-success-bg-v2)' : displayStatus === 'sent' ? 'var(--wp-info-bg-v2)' : displayStatus === 'rejected' ? 'var(--wp-error-bg-v2)' : displayStatus === 'converted' ? 'var(--wp-purple-bg)' : displayStatus === 'expired' ? 'var(--wp-warning-bg-v2)' : 'var(--wp-surface-2)',
            color: displayStatus === 'approved' ? 'var(--wp-success-v2)' : displayStatus === 'sent' ? 'var(--wp-info-v2)' : displayStatus === 'rejected' ? 'var(--wp-error-v2)' : displayStatus === 'converted' ? 'var(--wp-purple)' : displayStatus === 'expired' ? 'var(--wp-warning-v2)' : 'var(--wp-text-2)',
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
          {displayStatusLabel} <ChevronLeft size={12} className="rotate-[-90deg]" />
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
                  try {
                    if (opt.key === 'sent') await resendEstimateEmail(estimate.id)
                    else await updateEstimate(estimate.id, { status: opt.key })
                    notify(locale === 'es' ? `Estado: ${opt.label}` : `Status: ${opt.label}`)
                    window.location.reload()
                  } catch (e) {
                    notify((e instanceof Error ? e.message : 'Update failed'), 'error')
                  }
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
                <Link href={`/${locale}/projects/${job.id}`} className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md"
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
              <span style={{ color: 'var(--wp-text)' }}>{new Date(estimate.createdAt || Date.now()).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
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
                <span style={{ color: 'var(--wp-text)' }}>{new Date(estimate.validUntil).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
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
            <div style={{ width: '200px' }}>
              <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                <span>Subtotal</span><span>${liveSubtotal.toFixed(2)}</span>
              </div>
              {liveDiscountAmount > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                  <span>Discount{estimate.discountType === 'percent' ? ` (${estimate.discountValue}%)` : ''}</span>
                  <span>-${liveDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {liveMarkupAmount > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                  <span>Markup ({estimate.markupPercent}%)</span>
                  <span>+${liveMarkupAmount.toFixed(2)}</span>
                </div>
              )}
              {liveTax > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-3)' }}>
                  <span>Tax</span><span>${liveTax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '2px solid var(--wp-brand)', fontSize: '1rem', fontWeight: 700, color: 'var(--wp-text)' }}>
                <span>Total</span><span>${liveTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* CLI-007 — Signed / Deposit / Contract chips */}
          {(estimate.signatureDataUrl || estimate.depositAmount || estimate.contractId) && (
            <div className="mb-4 pb-4 flex flex-wrap items-center gap-2" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              {estimate.signatureDataUrl && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                  ✓ Signed{estimate.signedByName ? ` by ${estimate.signedByName}` : ''}
                  {estimate.signedAt && ` · ${new Date(estimate.signedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}`}
                </span>
              )}
              {estimate.depositAmount && parseFloat(estimate.depositAmount) > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: estimate.depositPaid ? 'var(--wp-success-bg-v2)' : 'var(--wp-warning-bg-v2)', color: estimate.depositPaid ? 'var(--wp-success-v2)' : 'var(--wp-warning-v2)' }}>
                  Deposit {estimate.depositType === 'percent' ? `${estimate.depositAmount}%` : `$${parseFloat(estimate.depositAmount).toFixed(2)}`}
                  {estimate.depositPaid ? ` · Paid${estimate.depositPaidAt ? ' ' + new Date(estimate.depositPaidAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : ''}` : ' · Unpaid'}
                </span>
              )}
              {estimate.contractId && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}>
                  📎 Contract attached
                </span>
              )}
            </div>
          )}

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
      <div className="hidden md:block p-8">
        <div className="mb-4">
          <Breadcrumbs items={[{ label: 'Estimates', href: `/${locale}/estimates` }, { label: estimate.number }]} />
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
          <div>
            {/* Hero card — title + total on right */}
            <div className="card p-5" style={{ boxShadow: 'var(--wp-elevation-1)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--wp-text)', letterSpacing: '-0.025em' }}>{estimate.number}</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--wp-text-3)' }}>
                    {estimate.createdAt && (
                      <>{locale === 'es' ? 'Creado' : 'Issued'} {new Date(estimate.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}</>
                    )}
                    {estimate.validUntil && (
                      <>{' · '}{locale === 'es' ? 'Válido hasta' : 'Valid until'} {new Date(estimate.validUntil).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}</>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--wp-text-3)' }}>Total</div>
                  <div className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--wp-text)', letterSpacing: '-0.025em' }}>
                    ${liveTotal.toFixed(2)}
                  </div>
                </div>
              </div>
              {/* Meta row */}
              <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
                <StatusPill tone={STATUS_TONE[displayStatus] ?? 'neutral'}>{displayStatusLabel}</StatusPill>
                {viewCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                    <Eye size={14} style={{ color: 'var(--wp-text-3)' }} />
                    <strong style={{ color: 'var(--wp-text)' }}>{viewCount}</strong> views
                  </span>
                )}
                {job && (
                  <Link href={`/${locale}/projects/${job.id}`} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                    <Briefcase size={14} style={{ color: 'var(--wp-text-3)' }} />
                    {locale === 'es' ? 'Vinculado a' : 'Linked to'} <strong style={{ color: 'var(--wp-text)' }}>{job.name}</strong>
                  </Link>
                )}
                {linkedInvoice && (
                  <Link href={`/${locale}/invoices/${linkedInvoice.id}`} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                    <FileText size={14} style={{ color: 'var(--wp-text-3)' }} />
                    {locale === 'es' ? 'Convertido en' : 'Converted to'} <strong style={{ color: 'var(--wp-text)' }}>{linkedInvoice.number}</strong>
                  </Link>
                )}
                {estimate.signatureDataUrl && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                    ✓ {locale === 'es' ? 'Firmado' : 'Signed'}{estimate.signedByName ? ` ${locale === 'es' ? 'por' : 'by'} ${estimate.signedByName}` : ''}
                    {estimate.signedAt && ` · ${new Date(estimate.signedAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')}`}
                  </span>
                )}
                {estimate.depositAmount && parseFloat(estimate.depositAmount) > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: estimate.depositPaid ? 'var(--wp-success-bg-v2)' : 'var(--wp-warning-bg-v2)', color: estimate.depositPaid ? 'var(--wp-success-v2)' : 'var(--wp-warning-v2)' }}>
                    {locale === 'es' ? 'Depósito' : 'Deposit'} {estimate.depositType === 'percent' ? `${estimate.depositAmount}%` : `$${parseFloat(estimate.depositAmount).toFixed(2)}`}
                    {estimate.depositPaid ? ` · ${locale === 'es' ? 'Pagado' : 'Paid'}${estimate.depositPaidAt ? ' ' + new Date(estimate.depositPaidAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US') : ''}` : ` · ${locale === 'es' ? 'Sin pagar' : 'Unpaid'}`}
                  </span>
                )}
                {estimate.contractId && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}>
                    📎 {locale === 'es' ? 'Contrato adjunto' : 'Contract attached'}
                  </span>
                )}
              </div>
            </div>

            {/* Action bar — separate card */}
            <div className="card mt-2 px-3 py-2 flex items-center gap-2 flex-wrap" style={{ boxShadow: 'var(--wp-elevation-1)' }}>
              {estimate.clientEmail && (
                <button onClick={() => setShowEmailModal(true)} disabled={isSendingEmail} className="btn-primary btn-sm">
                  <Mail size={14} /> {isSendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email'}
                </button>
              )}
              {(status === 'approved' || status === 'sent') && (
                <button onClick={() => setShowConvertConfirm(true)} disabled={isPending || isConverting} className="btn-sm" style={{ background: 'var(--wp-purple)', color: 'var(--wp-text-inverse)', borderRadius: 'var(--wp-radius-md)', padding: '0.375rem 0.75rem', fontWeight: 600, fontSize: '0.75rem' }}>
                  {isConverting ? <><Loader2 size={14} className="animate-spin" /> Converting...</> : <><ArrowRight size={14} /> {t.convertToInvoice}</>}
                </button>
              )}
              <div style={{ width: '1px', height: '20px', background: 'var(--wp-border-v2)', margin: '0 4px' }} />
              {hasMaterialItems && (
                <button onClick={handleGenerateShoppingList} disabled={isGeneratingList} className="btn-ghost btn-sm" title="Materials list" style={{ minHeight: 'auto' }}>
                  {isGeneratingList ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                </button>
              )}
              <Link href={`/${locale}/estimates/${estimate.id}/print`} className="btn-ghost btn-sm" style={{ minHeight: 'auto' }} title="Print">
                <FileText size={14} />
              </Link>
              <Link href={`/${locale}/estimates/${estimate.id}/edit`} className="btn-ghost btn-sm" style={{ minHeight: 'auto' }} title={t.edit}>
                <Edit size={14} />
              </Link>
              <div className="flex-1" />
              <button onClick={() => setShowDeleteModal(true)} disabled={isPending} className="btn-ghost btn-sm hover:!text-red-500" style={{ minHeight: 'auto', color: 'var(--wp-error-v2)' }} title={t.delete}>
                <Trash2 size={14} />
              </button>
            </div>

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
                  <Link href={`/${locale}/projects/${job.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-brand)' }}>
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
              total={`$${liveTotal.toFixed(2)}`}
              rows={[
                { k: 'Subtotal', v: `$${liveSubtotal.toFixed(2)}` },
                ...(liveMarkupAmount > 0 ? [{ k: `Markup (${estimate.markupPercent}%)`, v: `+$${liveMarkupAmount.toFixed(2)}` }] : []),
                ...(liveDiscountAmount > 0 ? [{ k: 'Discount', v: `-$${liveDiscountAmount.toFixed(2)}` }] : []),
                { k: 'Tax', v: `$${liveTax.toFixed(2)}` },
              ]}
            />

            <SideCard label={locale === 'es' ? 'Actividad' : 'Activity'}>
              <TimelineList items={timelineItems} />
            </SideCard>

            {portalUrl && (
              <SideCard label={locale === 'es' ? 'Portal del cliente' : 'Client portal'} className="!border-dashed !border-[color:var(--wp-info-v2)]">
                <div className="rounded-md px-2.5 py-2 text-xs font-mono break-all" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
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
