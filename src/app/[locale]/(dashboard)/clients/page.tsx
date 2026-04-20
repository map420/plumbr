import { getClients } from '@/lib/actions/clients'
import { getJobs } from '@/lib/actions/jobs'
import { getInvoices } from '@/lib/actions/invoices'
import { getEstimates } from '@/lib/actions/estimates'
import { ClientsClient } from './_components/ClientsClient'

export default async function ClientsPage() {
  const [clients, jobs, invoices, estimates] = await Promise.all([getClients(), getJobs(), getInvoices(), getEstimates()])

  const stats: Record<string, { jobCount: number; revenue: number; billed: number; outstanding: number; lastActivityAt: Date | null; hasLiveJob: boolean }> = {}
  const bump = (clientId: string) => {
    if (!stats[clientId]) stats[clientId] = { jobCount: 0, revenue: 0, billed: 0, outstanding: 0, lastActivityAt: null, hasLiveJob: false }
    return stats[clientId]
  }
  const touch = (clientId: string, d: Date | null | undefined) => {
    if (!d) return
    const s = bump(clientId)
    const dt = typeof d === 'string' ? new Date(d) : d
    if (!s.lastActivityAt || dt > s.lastActivityAt) s.lastActivityAt = dt
  }

  for (const j of jobs) {
    if (!j.clientId) continue
    const s = bump(j.clientId)
    s.jobCount++
    // Cliente con job activo/lead nunca es "inactive" (aunque no haya otras señales de fecha).
    if (j.status === 'active' || j.status === 'lead') s.hasLiveJob = true
    // E2/E3 — usar SOLO señales reales de trabajo: endDate/startDate. Evitamos createdAt
    // porque al reseedear queda "now" y falsea la inactividad.
    touch(j.clientId, j.endDate ?? j.startDate ?? null)
  }
  for (const inv of invoices) {
    const job = jobs.find(j => j.id === inv.jobId)
    const clientId = job?.clientId ?? null
    if (!clientId) continue
    const s = bump(clientId)
    const totalNum = parseFloat(inv.total)
    // LST-002 / TRV-008: billed = Σ invoices emitidas (excluye draft); outstanding = sent+overdue pendientes; revenue = paid only
    if (inv.status !== 'draft' && inv.status !== 'cancelled') s.billed += totalNum
    if (inv.status === 'sent' || inv.status === 'overdue') s.outstanding += totalNum
    if (inv.status === 'paid') s.revenue += totalNum
    // E2/E3 — solo contar paidAt; los createdAt/updatedAt son ruido del seeder.
    touch(clientId, inv.paidAt ?? null)
  }
  for (const est of estimates) {
    if (!est.clientId) continue
    // Señales estables para estimates: firma o depósito.
    // NO usamos updatedAt: `recomputeAndPersistTotals` lo modifica sin ser un cambio semántico.
    touch(est.clientId, est.signedAt ?? est.depositPaidAt ?? null)
  }

  return <ClientsClient initialClients={clients} clientStats={stats} />
}
