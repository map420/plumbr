import { notFound } from 'next/navigation'
import { getEstimate, getLineItems } from '@/lib/actions/estimates'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { generateQR } from '@/lib/qr'
import { PrintControls } from './_components/PrintControls'

type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'

const TYPE_CHIP_STYLES: Record<LineItemType, { color: string; background: string }> = {
  labor: { color: '#1D4ED8', background: '#EFF6FF' },
  material: { color: '#15803D', background: '#F0FDF4' },
  subcontractor: { color: '#B45309', background: '#FFFBEB' },
  other: { color: '#52525B', background: '#F1F1F3' },
}

export default async function PrintEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await requireUser()
  const [estimate, lineItems, user] = await Promise.all([
    getEstimate(id),
    getLineItems(id),
    dbAdapter.users.findById(userId),
  ])
  if (!estimate) notFound()

  const portalUrl = estimate.shareToken ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://workpilot.mrlabs.io'}/en/portal/${estimate.shareToken}` : null
  const qrDataUrl = portalUrl ? await generateQR(portalUrl) : null

  const companyName = user?.companyName || 'WorkPilot'
  const companyPhone = user?.phone || ''
  const companyEmail = user?.email || ''
  const businessTaxId = (user as any)?.businessTaxId || ''
  const companyInitials = companyName.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  // Deposit calculation (shown as a callout below the totals when applicable)
  const depositAmount = estimate.depositAmount && parseFloat(estimate.depositAmount) > 0
    ? (estimate.depositType === 'percent'
        ? (parseFloat(estimate.total) * parseFloat(estimate.depositAmount) / 100)
        : parseFloat(estimate.depositAmount))
    : null

  return (
    <div className="bg-white min-h-screen">
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <PrintControls />

      <div className="max-w-2xl mx-auto px-12 py-10 print:px-0 print:py-0">

        {/* Header — logo + company | estimate #/dates */}
        <div className="flex justify-between items-start pb-6 mb-7" style={{ borderBottom: '2px solid #0F172A' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#0F172A', color: '#A5B4FC', fontWeight: 800, fontSize: 14 }}>
              {companyInitials}
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight" style={{ color: '#0F172A' }}>{companyName}</h1>
              {businessTaxId && <p className="text-xs mt-0.5" style={{ color: '#A1A1AA' }}>Licensed · Tax #{businessTaxId}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#A1A1AA' }}>Estimate</p>
            <h2 className="text-2xl font-bold tracking-tight tabular-nums mt-0.5" style={{ color: '#18181B' }}>{estimate.number}</h2>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#52525B' }}>
              <strong style={{ color: '#18181B', fontWeight: 500 }}>Issued</strong> · {new Date(estimate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              {estimate.validUntil && (
                <>
                  <br />
                  <strong style={{ color: '#18181B', fontWeight: 500 }}>Valid until</strong> · {new Date(estimate.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Two-column parties block (From / Billed to) */}
        <div className="grid grid-cols-2 gap-7 mb-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] pb-1.5 mb-1.5 border-b" style={{ color: '#A1A1AA', borderColor: '#EAEAEC' }}>From</p>
            <p className="text-sm font-semibold" style={{ color: '#18181B' }}>{companyName}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#52525B' }}>
              {companyPhone && <>{companyPhone}<br /></>}
              {companyEmail && <>{companyEmail}<br /></>}
              {businessTaxId && <>Tax #: {businessTaxId}</>}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] pb-1.5 mb-1.5 border-b" style={{ color: '#A1A1AA', borderColor: '#EAEAEC' }}>Billed to</p>
            <p className="text-sm font-semibold" style={{ color: '#18181B' }}>{estimate.clientName}</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: '#52525B' }}>
              {estimate.clientEmail && <>{estimate.clientEmail}<br /></>}
              {estimate.clientPhone && <>{estimate.clientPhone}</>}
            </p>
          </div>
        </div>

        {/* Line items table */}
        <table className="w-full text-sm mb-4">
          <thead style={{ background: '#F7F7F8' }}>
            <tr>
              <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.05em]" style={{ color: '#52525B', borderBottom: '1px solid #EAEAEC' }}>Item</th>
              <th className="text-center py-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.05em] w-14" style={{ color: '#52525B', borderBottom: '1px solid #EAEAEC' }}>Qty</th>
              <th className="text-right py-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.05em] w-20" style={{ color: '#52525B', borderBottom: '1px solid #EAEAEC' }}>Rate</th>
              <th className="text-right py-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.05em] w-24" style={{ color: '#52525B', borderBottom: '1px solid #EAEAEC' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li) => {
              const typeStyle = TYPE_CHIP_STYLES[li.type as LineItemType] ?? TYPE_CHIP_STYLES.other
              return (
                <tr key={li.id} style={{ borderBottom: '1px solid #EAEAEC' }}>
                  <td className="py-3 px-3">
                    <span
                      className="inline-block text-[9px] font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded mb-1"
                      style={{ color: typeStyle.color, background: typeStyle.background }}
                    >
                      {li.type}
                    </span>
                    <div className="text-xs" style={{ color: '#18181B' }}>{li.description}</div>
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums text-xs" style={{ color: '#52525B' }}>{li.quantity}</td>
                  <td className="py-3 px-2 text-right tabular-nums text-xs" style={{ color: '#52525B' }}>${parseFloat(li.unitPrice).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right font-semibold tabular-nums text-xs" style={{ color: '#18181B' }}>${parseFloat(li.total).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Totals — boxed, right-aligned */}
        <div className="flex justify-end mb-5">
          <div className="w-64 rounded-lg p-4" style={{ background: '#F7F7F8', border: '1px solid #EAEAEC' }}>
            <div className="flex justify-between text-xs py-0.5 tabular-nums" style={{ color: '#52525B' }}>
              <span>Subtotal</span>
              <span>${parseFloat(estimate.subtotal).toFixed(2)}</span>
            </div>
            {parseFloat(estimate.tax) > 0 && (
              <div className="flex justify-between text-xs py-0.5 tabular-nums" style={{ color: '#52525B' }}>
                <span>Tax</span>
                <span>${parseFloat(estimate.tax).toFixed(2)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-lg font-extrabold tracking-tight tabular-nums pt-2 mt-2"
              style={{ borderTop: '1px solid #EAEAEC', color: '#0F172A' }}
            >
              <span>Total</span>
              <span>${parseFloat(estimate.total).toFixed(2)}</span>
            </div>
            {depositAmount !== null && (
              <div
                className="flex justify-between text-xs font-medium mt-2 pt-1.5 tabular-nums"
                style={{ color: '#B45309', borderTop: '1px solid #EAEAEC' }}
              >
                <span>Deposit {estimate.depositType === 'percent' ? `(${estimate.depositAmount}%)` : ''}</span>
                <span>${depositAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Signature */}
        {estimate.signatureDataUrl && (
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid #EAEAEC' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: '#A1A1AA' }}>Client Signature</p>
            <img src={estimate.signatureDataUrl} alt="Signature" className="h-14 mb-1" />
            <p className="text-xs" style={{ color: '#52525B' }}>{estimate.signedByName}</p>
            {estimate.signedAt && <p className="text-[10px]" style={{ color: '#A1A1AA' }}>{new Date(estimate.signedAt).toLocaleDateString()}</p>}
          </div>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] pb-1.5 mb-1.5 border-b" style={{ color: '#A1A1AA', borderColor: '#EAEAEC' }}>Scope &amp; terms</p>
            <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: '#52525B' }}>{estimate.notes}</p>
          </div>
        )}

        {/* Approve-online CTA (navy) */}
        {portalUrl && (
          <div className="rounded-lg px-4 py-3 mb-5 flex justify-between items-center no-print" style={{ background: '#0F172A', color: 'white' }}>
            <div className="text-xs">
              <div className="text-sm font-semibold">Ready to approve?</div>
              <div style={{ opacity: 0.7, marginTop: 1 }}>Scan the QR or visit the portal link to sign digitally.</div>
            </div>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold px-3.5 py-2 rounded-md"
              style={{ background: 'white', color: '#0F172A' }}
            >
              Approve online →
            </a>
          </div>
        )}

        {/* QR + portal link */}
        {qrDataUrl && (
          <div className="grid grid-cols-[80px_1fr] gap-4 items-center pt-4" style={{ borderTop: '1px solid #EAEAEC' }}>
            <img src={qrDataUrl} alt="View online" className="w-20 h-20 rounded" />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#18181B' }}>Secure client portal</p>
              <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: '#A1A1AA' }}>View line items, ask questions and sign digitally.</p>
              {portalUrl && (
                <span className="inline-block mt-1.5 font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: '#F7F7F8', color: '#52525B' }}>
                  {portalUrl.replace(/^https?:\/\//, '')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Legal + footer */}
        <div className="mt-6 pt-3 text-center" style={{ borderTop: '1px solid #F1F1F3' }}>
          <p className="text-[9px] leading-relaxed" style={{ color: '#A1A1AA' }}>
            By approving, the customer agrees to the services and conditions outlined in this estimate.
            <br />
            {companyName} · Thank you for your business.
          </p>
        </div>
      </div>
    </div>
  )
}
