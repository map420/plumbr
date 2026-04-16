'use client'

import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteEstimate, updateEstimate, resendEstimateEmail } from '@/lib/actions/estimates'
import { createInvoice } from '@/lib/actions/invoices'
import { createShoppingListFromEstimate } from '@/lib/actions/shopping-lists'
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { BottomSheet } from '@/components/BottomSheet'
import { Edit, Trash2, ArrowRight, Loader2, Briefcase, Eye, Smartphone, Mail, FileText, Link2, Copy, Check, ChevronLeft, MoreHorizontal, Printer, DollarSign, Send, ShoppingCart } from 'lucide-react'
import { sendEstimateSms } from '@/lib/actions/sms'

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
type Estimate = { id: string; number: string; jobId: string | null; clientName: string; clientEmail: string | null; clientPhone?: string | null; status: string; subtotal: string; tax: string; total: string; validUntil: Date | null; notes: string | null; shareToken?: string | null; createdAt?: Date }
type CompanyInfo = { name: string; phone: string | null; email: string | null; logoUrl: string | null; businessTaxId: string | null }
type LineItem = { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string }
type T = { back: string; edit: string; delete: string; convertToInvoice: string; status: Record<EstimateStatus, string>; fields: Record<string, string>; lineItems: { type: Record<LineItemType, string>; fields: Record<string, string> } }

const STATUS_OPTIONS: EstimateStatus[] = ['draft', 'sent', 'approved', 'rejected', 'converted']

function CompanyHeader({ company }: { company: CompanyInfo }) {
  const [logoError, setLogoError] = useState(false)
  const isImageUrl = company.logoUrl && /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(company.logoUrl)
  const showLogo = isImageUrl && !logoError

  return (
    <div className="flex items-start gap-3 mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
      {/* Logo or initials */}
      {showLogo ? (
        <img src={company.logoUrl!} alt="" className="w-12 h-12 rounded-lg object-contain shrink-0" onError={() => setLogoError(true)} />
      ) : (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--wp-primary)' }}>
          <span style={{ color: 'white', fontSize: '1rem', fontWeight: 800 }}>
            {company.name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      {/* Company details */}
      <div>
        <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: 1.2 }}>{company.name}</p>
        {company.phone && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)', marginTop: '0.25rem' }}>Phone: {company.phone}</p>}
        {company.email && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>Email: {company.email}</p>}
        {company.businessTaxId && <p style={{ fontSize: '0.6875rem', color: 'var(--wp-text-muted)' }}>Tax #: {company.businessTaxId}</p>}
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
    } catch (err: any) {
      alert('Failed to send: ' + err.message)
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleSendSms() {
    setIsSendingSms(true)
    try {
      const result = await sendEstimateSms(estimate.id, clientPhone!)
      if (!result.success) alert(result.error || 'SMS failed')
    } catch (err: any) {
      alert('SMS failed: ' + (err.message || 'Unknown error'))
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
            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--wp-text-primary)' }}>Send to {estimate.clientName}?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--wp-text-muted)' }}>Email: <span style={{ color: 'var(--wp-text-secondary)', fontWeight: 500 }}>{estimate.clientEmail}</span></p>
            <div className="rounded-lg p-3 mb-5 text-sm" style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-secondary)' }}>
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

      {/* More menu bottom sheet */}
      <BottomSheet open={showMoreMenu} onClose={() => setShowMoreMenu(false)} title="Actions">
        <div className="py-1">
          <Link href={`/${locale}/estimates/${estimate.id}/edit`} onClick={() => setShowMoreMenu(false)}
            className="flex items-center gap-3 px-5 py-3.5 text-sm" style={{ color: 'var(--wp-text-primary)' }}>
            <Edit size={18} style={{ color: 'var(--wp-text-muted)' }} /> {t.edit}
          </Link>
          {clientPhone && (
            <button onClick={() => { setShowMoreMenu(false); handleSendSms() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text-primary)' }}>
              <Smartphone size={18} style={{ color: 'var(--wp-text-muted)' }} /> Send SMS
            </button>
          )}
          {portalUrl && (
            <button onClick={() => { setShowMoreMenu(false); handleCopyLink() }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-text-primary)' }}>
              <Link2 size={18} style={{ color: 'var(--wp-text-muted)' }} /> Copy Portal Link
            </button>
          )}
          <button onClick={() => { setShowMoreMenu(false); setShowDeleteModal(true) }}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-left" style={{ color: 'var(--wp-error)' }}>
            <Trash2 size={18} /> {t.delete}
          </button>
        </div>
      </BottomSheet>

      {/* ── MOBILE LAYOUT — Joist pattern ─────────────────────── */}
      <div className="md:hidden bg-white min-h-full">

        {/* Header: < Estimates | #number | Edit */}
        <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <div className="flex-1 flex items-center justify-start">
            <button onClick={() => router.push(`/${locale}/estimates`)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Estimates
            </button>
          </div>
          <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>#{estimate.number.replace('EST-', '')}</span>
          <div className="flex-1 flex items-center justify-end">
            <Link href={`/${locale}/estimates/${estimate.id}/edit`}
              className="flex items-center"
              style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
              Edit
            </Link>
          </div>
        </div>

        {/* Action strip — 4 equitative actions (Joist pattern) */}
        <div className="flex items-stretch" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <button onClick={() => estimate.clientEmail ? setShowEmailModal(true) : null} disabled={isSendingEmail || !estimate.clientEmail}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 disabled:opacity-30"
            style={{ color: 'var(--wp-text-secondary)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Send size={16} />
            SEND
          </button>
          <button onClick={() => router.push(`/${locale}/estimates/${estimate.id}/print`)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-secondary)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Printer size={16} />
            PRINT
          </button>
          <button onClick={status === 'approved' || status === 'sent' ? handleConvert : undefined}
            disabled={isConverting || (status !== 'approved' && status !== 'sent')}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 disabled:opacity-30"
            style={{ color: 'var(--wp-text-secondary)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {isConverting ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
            INVOICE
          </button>
          <button onClick={() => setShowMoreMenu(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
            style={{ color: 'var(--wp-text-secondary)', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <MoreHorizontal size={16} />
            MORE
          </button>
        </div>

        {/* Status bar — subtle bg, colored text, tap to change */}
        <button onClick={() => setShowStatusMenu(true)} className="w-full flex items-center justify-center gap-1 py-1.5"
          style={{
            background: status === 'approved' ? 'var(--wp-success-bg)' : status === 'sent' ? 'var(--wp-info-bg)' : status === 'rejected' ? 'var(--wp-error-bg)' : status === 'converted' ? '#F5F3FF' : 'var(--wp-bg-muted)',
            color: status === 'approved' ? 'var(--wp-success)' : status === 'sent' ? 'var(--wp-info)' : status === 'rejected' ? 'var(--wp-error)' : status === 'converted' ? '#7C3AED' : 'var(--wp-text-secondary)',
            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
          {t.status[status]} <ChevronLeft size={12} className="rotate-[-90deg]" />
        </button>

        {/* Status picker bottom sheet */}
        <BottomSheet open={showStatusMenu} onClose={() => setShowStatusMenu(false)} title="Change Status">
          <div className="py-1">
            {([
              { key: 'sent' as EstimateStatus, label: locale === 'es' ? 'Pendiente' : 'Pending', color: 'var(--wp-info)' },
              { key: 'approved' as EstimateStatus, label: locale === 'es' ? 'Aprobado' : 'Approved', color: 'var(--wp-success)' },
              { key: 'rejected' as EstimateStatus, label: locale === 'es' ? 'Rechazado' : 'Declined', color: 'var(--wp-error)' },
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
                style={{ color: status === opt.key ? opt.color : 'var(--wp-text-primary)' }}>
                <span style={{ fontWeight: status === opt.key ? 700 : 400 }}>{opt.label}</span>
                {status === opt.key && <Check size={16} style={{ color: opt.color }} />}
              </button>
            ))}
          </div>
        </BottomSheet>

        {/* Document view */}
        <div className="px-5 pt-4 pb-5">

          {/* Company info */}
          {company && <CompanyHeader company={company} />}

          {/* Prepared For */}
          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wp-text-primary)', marginBottom: '0.375rem' }}>Prepared For</p>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-text-primary)' }}>{estimate.clientName}</p>
                {estimate.clientEmail && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>{estimate.clientEmail}</p>}
                {clientPhone && <p style={{ fontSize: '0.75rem', color: 'var(--wp-text-muted)' }}>{clientPhone}</p>}
              </div>
              {job && (
                <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md"
                  style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-accent)', background: 'var(--wp-accent-subtle)' }}>
                  <Briefcase size={10} /> Job →
                </Link>
              )}
            </div>
          </div>

          {/* Document metadata */}
          <div className="mb-5 pb-5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-muted)' }}>Estimate #</span>
              <span style={{ color: 'var(--wp-text-primary)' }}>{estimate.number.replace('EST-', '')}</span>
            </div>
            <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
              <span style={{ color: 'var(--wp-text-muted)' }}>Date</span>
              <span style={{ color: 'var(--wp-text-primary)' }}>{new Date(estimate.createdAt || Date.now()).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
            </div>
            {company?.businessTaxId && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-muted)' }}>Business / Tax #</span>
                <span style={{ color: 'var(--wp-text-primary)' }}>{company.businessTaxId}</span>
              </div>
            )}
            {estimate.validUntil && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-muted)' }}>Valid Until</span>
                <span style={{ color: 'var(--wp-text-primary)' }}>{new Date(estimate.validUntil).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
              </div>
            )}
            {viewCount > 0 && (
              <div className="flex justify-between py-1.5" style={{ fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--wp-text-muted)' }}>Client Activity</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--wp-success)' }}>
                  <Eye size={11} /> Viewed {viewCount}x
                </span>
              </div>
            )}
          </div>

          {/* Line items — clean table */}
          <div className="mb-4">
            <div className="flex items-center justify-between pb-2" style={{ borderBottom: '2px solid var(--wp-border)', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span>Description</span>
              <div className="flex gap-6">
                <span className="w-8 text-center">Qty</span>
                <span className="w-16 text-right">Total</span>
              </div>
            </div>
            {lineItems.map(li => (
              <div key={li.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                <div className="min-w-0 flex-1">
                  <span style={{ fontSize: '0.875rem', color: 'var(--wp-text-primary)' }}>
                    <span style={{ color: 'var(--wp-text-muted)', fontSize: '0.75rem' }}>{t.lineItems.type[li.type as LineItemType]} · </span>
                    {li.description}
                  </span>
                </div>
                <div className="flex gap-6 shrink-0">
                  <span className="w-8 text-center" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-muted)' }}>{parseFloat(li.quantity).toFixed(0)}</span>
                  <span className="w-16 text-right text-price" style={{ fontSize: '0.875rem', color: 'var(--wp-text-primary)' }}>${parseFloat(li.total).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals — right aligned */}
          <div className="flex justify-end mb-6">
            <div style={{ width: '160px' }}>
              <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-muted)' }}>
                <span>Subtotal</span><span>${parseFloat(estimate.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(estimate.tax) > 0 && (
                <div className="flex justify-between py-1" style={{ fontSize: '0.8125rem', color: 'var(--wp-text-muted)' }}>
                  <span>Tax</span><span>${parseFloat(estimate.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '2px solid var(--wp-primary)', fontSize: '1rem', fontWeight: 700, color: 'var(--wp-text-primary)' }}>
                <span>Total</span><span>${parseFloat(estimate.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Notes</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--wp-text-secondary)', whiteSpace: 'pre-wrap' }}>{estimate.notes}</p>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Photos ({photos.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map(p => (
                  <img key={p.id} src={p.thumbnailUrl || p.url} alt={p.description || ''} className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Portal link */}
          {portalUrl && (
            <div className="mb-4">
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Client Portal</p>
              <div className="flex gap-2">
                <input type="text" readOnly value={portalUrl}
                  className="flex-1 rounded-lg px-3 py-2 text-xs select-all outline-none"
                  style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)' }}
                  onFocus={e => e.target.select()} />
                <button onClick={handleCopyLink} className="btn-secondary btn-sm" style={{ minHeight: 'auto' }}>
                  {linkCopied ? <><Check size={12} style={{ color: 'var(--wp-success)' }} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (unchanged) ─────────────────────────── */}
      <div className="hidden md:block p-8 max-w-3xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Breadcrumbs items={[{ label: 'Estimates', href: `/${locale}/estimates` }, { label: estimate.number }]} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{estimate.number}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <EstimateStatusBadge status={status} label={t.status[status]} />
              {viewCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ background: 'var(--wp-info-bg)', color: 'var(--wp-info)' }}>
                  <Eye size={12} /> Viewed {viewCount} time{viewCount !== 1 ? 's' : ''}
                </span>
              )}
              {job && (
                <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--wp-text-muted)' }}>
                  <Briefcase size={11} />{job.name} →
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {estimate.clientEmail && (
              <button onClick={() => setShowEmailModal(true)} disabled={isSendingEmail} className="btn-primary btn-sm">
                <Mail size={14} /> {isSendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Email to Client'}
              </button>
            )}
            {(status === 'approved' || status === 'sent') && (
              <button onClick={handleConvert} disabled={isPending || isConverting} className="btn-sm" style={{ background: '#7C3AED', color: 'white', borderRadius: 'var(--wp-radius-md)', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>
                {isConverting ? <><Loader2 size={14} className="animate-spin" /> Converting...</> : <><ArrowRight size={14} /> {t.convertToInvoice}</>}
              </button>
            )}
            {hasMaterialItems && (
              <button
                onClick={handleGenerateShoppingList}
                disabled={isGeneratingList}
                className="btn-secondary btn-sm"
                title="Create a shopping list from material line items"
              >
                {isGeneratingList ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><ShoppingCart size={14} /> Materials List</>}
              </button>
            )}
            {generateError && (
              <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--wp-error)', background: '#FEE2E2' }}>
                {generateError}
              </span>
            )}
            <Link href={`/${locale}/estimates/${estimate.id}/print`} className="btn-secondary btn-sm"><FileText size={14} /> Print</Link>
            <Link href={`/${locale}/estimates/${estimate.id}/edit`} className="btn-secondary btn-sm"><Edit size={14} /> {t.edit}</Link>
            <button onClick={() => setShowDeleteModal(true)} disabled={isPending} className="btn-danger btn-sm"><Trash2 size={14} /> {t.delete}</button>
          </div>
        </div>

        {/* Desktop status selector */}
        <div className="card p-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm mr-1" style={{ color: 'var(--wp-text-muted)' }}>Status:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => startTransition(async () => { if (s === 'sent') await resendEstimateEmail(estimate.id); else await updateEstimate(estimate.id, { status: s }); router.refresh() })} disabled={isPending}
                className={`tab-pill ${status === s ? 'tab-pill-active' : ''}`}>
                {t.status[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop client info */}
        <div className="card p-5 mb-4 grid grid-cols-2 gap-4 text-sm">
          <div><span style={{ color: 'var(--wp-text-muted)' }}>{t.fields.clientName}</span><p className="font-medium mt-0.5">{estimate.clientName}</p></div>
          <div><span style={{ color: 'var(--wp-text-muted)' }}>{t.fields.clientEmail}</span><p className="font-medium mt-0.5">{estimate.clientEmail || '—'}</p></div>
          <div><span style={{ color: 'var(--wp-text-muted)' }}>{t.fields.validUntil}</span><p className="font-medium mt-0.5">{estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString() : '—'}</p></div>
        </div>

        {/* Desktop line items */}
        <div className="card p-5 mb-4">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid var(--wp-border)' }}>
              <th className="text-left py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>Type</th>
              <th className="text-left py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.lineItems.fields.description}</th>
              <th className="text-center py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.lineItems.fields.quantity}</th>
              <th className="text-right py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.lineItems.fields.unitPrice}</th>
              <th className="text-right py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>{t.lineItems.fields.total}</th>
            </tr></thead>
            <tbody>
              {lineItems.map(li => (
                <tr key={li.id} style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
                  <td className="py-2.5 pr-3"><span className="badge badge-sm badge-draft">{t.lineItems.type[li.type as LineItemType]}</span></td>
                  <td className="py-2.5">{li.description}</td>
                  <td className="py-2.5 text-center" style={{ color: 'var(--wp-text-muted)' }}>{li.quantity}</td>
                  <td className="py-2.5 text-right" style={{ color: 'var(--wp-text-muted)' }}>${parseFloat(li.unitPrice).toFixed(2)}</td>
                  <td className="py-2.5 text-right font-medium">${parseFloat(li.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-4 space-y-1 text-sm ml-auto max-w-xs" style={{ borderTop: '1px solid var(--wp-border)' }}>
            <div className="flex justify-between" style={{ color: 'var(--wp-text-muted)' }}><span>{t.fields.subtotal}</span><span>${parseFloat(estimate.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between" style={{ color: 'var(--wp-text-muted)' }}><span>{t.fields.tax}</span><span>${parseFloat(estimate.tax).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base pt-1" style={{ color: 'var(--wp-text-primary)' }}><span>{t.fields.total}</span><span>${parseFloat(estimate.total).toFixed(2)}</span></div>
          </div>
        </div>

        {estimate.notes && <div className="card p-4 text-sm mb-4"><span style={{ color: 'var(--wp-text-muted)' }}>{t.fields.notes}</span><p className="mt-1 whitespace-pre-wrap" style={{ color: 'var(--wp-text-secondary)' }}>{estimate.notes}</p></div>}

        {photos.length > 0 && (
          <div className="card p-4 mb-4">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--wp-text-secondary)' }}>Photos ({photos.length})</h3>
            <div className="grid grid-cols-4 gap-2">
              {photos.map(p => <img key={p.id} src={p.thumbnailUrl || p.url} alt={p.description || ''} className="w-full aspect-square object-cover rounded-lg" />)}
            </div>
          </div>
        )}

        {portalUrl && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 size={14} style={{ color: 'var(--wp-primary)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--wp-text-secondary)' }}>Client Portal Link</span>
            </div>
            <div className="flex gap-2">
              <input type="text" readOnly value={portalUrl} className="flex-1 rounded-lg px-3 py-2 text-xs select-all outline-none" style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)' }} onFocus={e => e.target.select()} />
              <button onClick={handleCopyLink} className="btn-secondary btn-sm" style={{ minHeight: 'auto' }}>
                {linkCopied ? <><Check size={12} style={{ color: 'var(--wp-success)' }} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
