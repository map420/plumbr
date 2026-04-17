import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getEstimate, getLineItems } from '@/lib/actions/estimates'
import { getJob } from '@/lib/actions/jobs'
import { getDocumentViewCount } from '@/lib/actions/tracking'
import { getPhotosByJob, getPhotosByEstimate } from '@/lib/actions/photos'
import { dbAdapter } from '@/lib/adapters/db'
import { requireUser } from '@/lib/actions/auth-helpers'
import { EstimateDetailClient } from '../_components/EstimateDetailClient'

export default async function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [te, tc, estimate, lineItems] = await Promise.all([
    getTranslations('estimates'), getTranslations('common'), getEstimate(id), getLineItems(id),
  ])
  if (!estimate) notFound()

  const userId = await requireUser()
  const [job, viewCount, estPhotos, user] = await Promise.all([
    estimate.jobId ? getJob(estimate.jobId) : null,
    getDocumentViewCount(id, 'estimate'),
    getPhotosByEstimate(id).catch(() => []),
    dbAdapter.users.findById(userId),
  ])
  const jobPhotos = estimate.jobId ? await getPhotosByJob(estimate.jobId).catch(() => []) : []
  const photos = [...estPhotos, ...jobPhotos].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)

  return (
    <EstimateDetailClient
      estimate={estimate} lineItems={lineItems} job={job ? { id: job.id, name: job.name } : null}
      viewCount={viewCount} clientPhone={estimate.clientPhone ?? null} shareToken={estimate.shareToken ?? null}
      photos={photos.map(p => ({ id: p.id, url: p.url, description: p.description, thumbnailUrl: (p as any).thumbnailUrl }))}
      company={{
        name: user?.companyName || 'WorkPilot',
        phone: user?.phone || null,
        email: user?.email || null,
        logoUrl: user?.logoUrl || null,
        businessTaxId: (user as any)?.businessTaxId || null,
      }}
      translations={{
        back: tc('back'), edit: tc('edit'), delete: tc('delete'),
        convertToInvoice: te('convertToInvoice'),
        status: { draft: te('status.draft'), sent: te('status.sent'), approved: te('status.approved'), rejected: te('status.rejected'), converted: te('status.converted') },
        fields: { clientName: te('fields.clientName'), clientEmail: te('fields.clientEmail'), validUntil: te('fields.validUntil'), notes: te('fields.notes'), subtotal: te('fields.subtotal'), tax: te('fields.tax'), total: te('fields.total') },
        lineItems: {
          type: { labor: te('lineItems.type.labor'), material: te('lineItems.type.material'), subcontractor: te('lineItems.type.subcontractor'), other: te('lineItems.type.other') },
          fields: { description: te('lineItems.fields.description'), quantity: te('lineItems.fields.quantity'), unitPrice: te('lineItems.fields.unitPrice'), total: te('lineItems.fields.total') },
        },
      }}
    />
  )
}
