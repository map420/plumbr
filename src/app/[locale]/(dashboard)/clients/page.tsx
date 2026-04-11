import { getClients } from '@/lib/actions/clients'
import { getJobs } from '@/lib/actions/jobs'
import { getInvoices } from '@/lib/actions/invoices'
import { ClientsClient } from './_components/ClientsClient'

export default async function ClientsPage() {
  const [clients, jobs, invoices] = await Promise.all([getClients(), getJobs(), getInvoices()])

  const stats: Record<string, { jobCount: number; revenue: number }> = {}
  for (const j of jobs) {
    if (!j.clientId) continue
    if (!stats[j.clientId]) stats[j.clientId] = { jobCount: 0, revenue: 0 }
    stats[j.clientId].jobCount++
  }
  for (const inv of invoices) {
    if (inv.status !== 'paid') continue
    const job = jobs.find(j => j.id === inv.jobId)
    const clientId = job?.clientId ?? null
    if (!clientId) continue
    if (!stats[clientId]) stats[clientId] = { jobCount: 0, revenue: 0 }
    stats[clientId].revenue += parseFloat(inv.total)
  }

  return <ClientsClient initialClients={clients} clientStats={stats} />
}
