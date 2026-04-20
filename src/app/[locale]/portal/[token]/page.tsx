import { notFound } from 'next/navigation'
import { getPortalData } from '@/lib/actions/portal'
import { recordDocumentView } from '@/lib/actions/tracking'
import { dbAdapter } from '@/lib/adapters/db'
import { PortalClient } from './_components/PortalClient'

export default async function PortalPage({ params }: { params: Promise<{ token: string; locale: string }> }) {
  const { token, locale } = await params
  // POR-003 — token inválido/expirado → 404 limpio sin leak de stack
  let data: Awaited<ReturnType<typeof getPortalData>> = null
  try {
    data = await getPortalData(token)
  } catch {
    data = null
  }
  if (!data) notFound()

  const contractorUserId = data.type === 'estimate' ? data.estimate.userId : data.type === 'invoice' ? data.invoice.userId : data.changeOrder.userId

  // Fire-and-forget tracking — don't block rendering on analytics write
  const doc = data.type === 'estimate' ? data.estimate : data.type === 'invoice' ? data.invoice : data.changeOrder
  const documentType = data.type === 'change_order' ? 'estimate' : data.type
  void recordDocumentView({ userId: contractorUserId, documentId: doc.id, documentType, ip: '', userAgent: '' }).catch(() => null)

  async function loadPhotos() {
    try {
      if (data!.type === 'estimate') {
        const est = data!.estimate
        // Parallel: own estimate photos + related job photos
        const [estPhotos, jobPhotos] = await Promise.all([
          dbAdapter.photos.findByEstimate(est.id),
          est.jobId
            ? dbAdapter.photos.findByJob(est.jobId)
            : dbAdapter.jobs.findAll(est.userId).then(async jobs => {
                const clientJobs = jobs.filter(j => j.clientName === est.clientName)
                const arrs = await Promise.all(clientJobs.map(j => dbAdapter.photos.findByJob(j.id)))
                return arrs.flat()
              }),
        ])
        return [...estPhotos, ...jobPhotos].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
      } else if (data!.type === 'invoice') {
        const inv = data!.invoice
        const jobId = (inv as { jobId?: string }).jobId
        if (jobId) return await dbAdapter.photos.findByJob(jobId)
        const jobs = await dbAdapter.jobs.findAll(inv.userId)
        const clientJobs = jobs.filter(j => j.clientName === inv.clientName)
        const arrs = await Promise.all(clientJobs.map(j => dbAdapter.photos.findByJob(j.id)))
        return arrs.flat()
      }
      return []
    } catch { return [] }
  }

  async function loadContractor() {
    try {
      const u = await dbAdapter.users.findById(contractorUserId)
      return u ? {
        companyName: u.companyName || u.name || 'WorkPilot',
        phone: u.phone || '',
        email: u.email || '',
        logoUrl: u.logoUrl || null,
      } : { companyName: 'WorkPilot', phone: '', email: '', logoUrl: null as string | null }
    } catch { return { companyName: 'WorkPilot', phone: '', email: '', logoUrl: null as string | null } }
  }

  // Photos + contractor independientes — ejecutan en paralelo
  const [photos, contractor] = await Promise.all([loadPhotos(), loadContractor()])

  return <PortalClient token={token} locale={locale} data={data} contractor={contractor} photos={photos.map(p => ({ id: p.id, url: p.url, description: p.description }))} />
}
