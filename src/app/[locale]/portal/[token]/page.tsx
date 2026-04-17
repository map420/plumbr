import { notFound } from 'next/navigation'
import { getPortalData } from '@/lib/actions/portal'
import { recordDocumentView } from '@/lib/actions/tracking'
import { dbAdapter } from '@/lib/adapters/db'
import { PortalClient } from './_components/PortalClient'

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  // Fetch photos for the document — check estimate, job, and related jobs by client
  let photos: { id: string; url: string; description: string | null }[] = []
  try {
    if (data.type === 'estimate') {
      const est = data.estimate
      const estPhotos = await dbAdapter.photos.findByEstimate(est.id)
      let jobPhotos: typeof estPhotos = []
      if (est.jobId) {
        jobPhotos = await dbAdapter.photos.findByJob(est.jobId)
      } else {
        // No jobId on estimate — find jobs by same client and get their photos
        const jobs = await dbAdapter.jobs.findAll(est.userId)
        const clientJobs = jobs.filter(j => j.clientName === est.clientName)
        for (const j of clientJobs) {
          const jp = await dbAdapter.photos.findByJob(j.id)
          jobPhotos.push(...jp)
        }
      }
      photos = [...estPhotos, ...jobPhotos].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    } else if (data.type === 'invoice') {
      const inv = data.invoice
      if ((inv as any).jobId) {
        photos = await dbAdapter.photos.findByJob((inv as any).jobId)
      } else {
        const jobs = await dbAdapter.jobs.findAll(inv.userId)
        const clientJobs = jobs.filter(j => j.clientName === inv.clientName)
        for (const j of clientJobs) {
          const jp = await dbAdapter.photos.findByJob(j.id)
          photos.push(...jp)
        }
      }
    }
  } catch { /* Don't block portal if photo fetch fails */ }

  try {
    const doc = data.type === 'estimate' ? data.estimate : data.type === 'invoice' ? data.invoice : data.changeOrder
    const userId = (doc as any).userId
    const documentId = doc.id
    const documentType = data.type === 'change_order' ? 'estimate' : data.type
    await recordDocumentView({ userId, documentId, documentType, ip: '', userAgent: '' })
  } catch {
    // Don't block rendering if tracking fails
  }

  return <PortalClient token={token} data={data} photos={photos.map(p => ({ id: p.id, url: p.url, description: p.description }))} />
}
