import { notFound } from 'next/navigation'
import { getClient } from '@/lib/actions/clients'
import { getJobs } from '@/lib/actions/jobs'
import { getEstimates } from '@/lib/actions/estimates'
import { getInvoices } from '@/lib/actions/invoices'
import { ClientDetailClient } from '../_components/ClientDetailClient'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, allJobs, allEstimates, allInvoices] = await Promise.all([
    getClient(id),
    getJobs(),
    getEstimates(),
    getInvoices(),
  ])

  if (!client) notFound()

  const jobs = allJobs.filter(j => j.clientId === id)
  const jobIds = new Set(jobs.map(j => j.id))
  // Include estimates linked by clientId OR by jobId (via jobs belonging to this client)
  const estimates = allEstimates.filter(e => e.clientId === id || (e.jobId && jobIds.has(e.jobId)))
  const invoices = allInvoices.filter(i => i.jobId && jobIds.has(i.jobId))

  return <ClientDetailClient client={client} jobs={jobs} estimates={estimates} invoices={invoices} />
}
