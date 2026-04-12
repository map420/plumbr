import { getTranslations } from 'next-intl/server'
import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { DashboardStats } from './_components/DashboardStats'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const userId = await authAdapter.getUserId()

  let stats = { activeJobs: 0, openEstimates: 0, revenueThisMonth: 0, avgMargin: null as number | null }
  let chartData = {
    revenueByMonth: [] as { month: string; revenue: number }[],
    jobsByStatus: [] as { status: string; count: number }[],
    conversionRate: 0,
    topClients: [] as { name: string; revenue: number }[],
  }

  let userName: string | null = null

  if (userId) {
    const [allJobs, allEstimates, allInvoices, allClients, userProfile] = await Promise.all([
      dbAdapter.jobs.findAll(userId),
      dbAdapter.estimates.findAll(userId),
      dbAdapter.invoices.findAll(userId),
      dbAdapter.clients.findAll(userId),
      dbAdapter.users.findById(userId),
    ])

    userName = userProfile?.name?.split(' ')[0] ?? null

    // KPI stats
    const activeJobs = allJobs.filter(j => j.status === 'active').length
    const openEstimates = allInvoices.filter(i =>
      i.status !== 'paid' && i.status !== 'cancelled'
    ).length

    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const revenueThisMonth = allInvoices
      .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= monthStart)
      .reduce((sum, i) => sum + parseFloat(i.total), 0)

    const jobsWithBudget = allJobs.filter(j => parseFloat(j.budgetedCost) > 0)
    const avgMargin = jobsWithBudget.length > 0
      ? jobsWithBudget.reduce((sum, j) => {
          const budget = parseFloat(j.budgetedCost)
          const actual = parseFloat(j.actualCost)
          return sum + ((budget - actual) / budget) * 100
        }, 0) / jobsWithBudget.length
      : null

    stats = { activeJobs, openEstimates, revenueThisMonth, avgMargin }

    // Revenue by month — last 6 months
    const now = new Date()
    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const revenue = allInvoices
        .filter(inv => inv.status === 'paid' && inv.paidAt && new Date(inv.paidAt) >= d && new Date(inv.paidAt) < end)
        .reduce((s, inv) => s + parseFloat(inv.total), 0)
      return {
        month: d.toLocaleString('en', { month: 'short' }),
        revenue: Math.round(revenue),
      }
    })

    // Jobs by status
    const statusCounts: Record<string, number> = {}
    for (const j of allJobs) statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1
    const jobsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    // Conversion rate: lead → active or completed
    const leads = allJobs.filter(j => j.status === 'lead').length
    const converted = allJobs.filter(j => ['active', 'completed'].includes(j.status)).length
    const total = leads + converted
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

    // Top 5 clients by revenue
    const clientRevenue: Record<string, { name: string; revenue: number }> = {}
    for (const inv of allInvoices) {
      if (inv.status !== 'paid') continue
      const job = allJobs.find(j => j.id === inv.jobId)
      if (!job?.clientId) {
        // fallback: group by clientName on job
        const key = job?.clientName ?? 'Unknown'
        if (!clientRevenue[key]) clientRevenue[key] = { name: key, revenue: 0 }
        clientRevenue[key].revenue += parseFloat(inv.total)
        continue
      }
      const client = allClients.find(c => c.id === job.clientId)
      const name = client?.name ?? job.clientName
      if (!clientRevenue[job.clientId]) clientRevenue[job.clientId] = { name, revenue: 0 }
      clientRevenue[job.clientId].revenue += parseFloat(inv.total)
    }
    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(c => ({ ...c, revenue: Math.round(c.revenue) }))

    chartData = { revenueByMonth, jobsByStatus, conversionRate, topClients }
  }

  return (
    <DashboardStats
      stats={stats}
      chartData={chartData}
      userName={userName}
      translations={{
        greeting: t('greeting', { name: '{name}' }),
        subtitle: t('subtitle'),
        stats: {
          activeJobs: t('stats.activeJobs'),
          openEstimates: t('stats.openEstimates'),
          revenueThisMonth: t('stats.revenueThisMonth'),
          avgJobMargin: t('stats.avgJobMargin'),
        },
        quickActions: {
          title: t('quickActions.title'),
          newEstimate: t('quickActions.newEstimate'),
          newJob: t('quickActions.newJob'),
        },
      }}
    />
  )
}
