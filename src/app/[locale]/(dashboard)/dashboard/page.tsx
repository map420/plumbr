import { getTranslations } from 'next-intl/server'
import { unstable_cache } from 'next/cache'
import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { dashboardTag } from '@/lib/cache-tags'
import { db } from '@/db'
import { shoppingLists, shoppingListItems } from '@/db/schema/shopping-lists'
import { eq, and, inArray, isNotNull } from 'drizzle-orm'
import { isScheduledToday } from '@/lib/schedule'
import { formatCurrencyCompact } from '@/lib/format'
import { DashboardStats } from './_components/DashboardStats'

// Bulk fetch wrapped in unstable_cache per user. Tag-invalidated from server
// actions that mutate jobs/estimates/invoices/expenses via
// revalidateTag(dashboardTag(userId)). Without this wrapper, every dashboard
// navigation re-runs 4 full-table scans.
function loadDashboardData(userId: string) {
  return unstable_cache(
    async () => {
      const [jobs, estimates, invoices, expenses, shopping] = await Promise.all([
        dbAdapter.jobs.findAll(userId),
        dbAdapter.estimates.findAll(userId),
        dbAdapter.invoices.findAll(userId),
        dbAdapter.expenses.findAll(userId),
        loadShoppingSummary(userId),
      ])
      return { jobs, estimates, invoices, expenses, shopping }
    },
    ['dashboard-data', userId],
    { revalidate: 60, tags: [dashboardTag(userId)] },
  )()
}

/**
 * Aggregate shopping-list activity for the dashboard alert.
 * Returns count of active lists and dollar total of pending items across them.
 * Cheap because it scans only this user's rows and only joins on lists that
 * are status='active'.
 */
async function loadShoppingSummary(userId: string): Promise<{ activeLists: number; pendingCost: number }> {
  const lists = await db.select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, 'active'), isNotNull(shoppingLists.jobId)))
  if (lists.length === 0) return { activeLists: 0, pendingCost: 0 }

  // Single query across all active lists — replaces a per-list for-loop that
  // serialized N DB round-trips.
  const items = await db
    .select({ estimatedCost: shoppingListItems.estimatedCost, status: shoppingListItems.status })
    .from(shoppingListItems)
    .where(and(
      inArray(shoppingListItems.shoppingListId, lists.map(l => l.id)),
      eq(shoppingListItems.status, 'pending'),
    ))
  const pendingCost = items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  return { activeLists: lists.length, pendingCost }
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const userId = await authAdapter.getUserId()

  const empty = {
    stats: { activeJobs: 0, revenueThisMonth: 0, unpaidTotal: 0, unpaidCount: 0, winRate: null as number | null },
    alerts: [] as { type: string; label: string; href: string }[],
    todayJobs: [] as { id: string; name: string; clientName: string; time: string | null }[],
    activeJobs: [] as { id: string; name: string; clientName: string }[],
    revenueByMonth: [] as { month: string; revenue: number; projected: number }[],
    dueThisWeek: [] as { id: string; number: string; clientName: string; total: string; dueDay: string }[],
    pipeline: { pending: 0, unpaid: 0, paid: 0 },
    insights: [] as { text: string; href: string; label: string }[],
    projectionSummary: '',
  }

  if (!userId) {
    return <DashboardStats {...empty} translations={buildTranslations(t)} />
  }

  const { jobs: allJobs, estimates: allEstimates, invoices: allInvoices, expenses: allExpenses, shopping } = await loadDashboardData(userId)

  const now = new Date()

  // ── KPIs ──
  const activeJobs = allJobs.filter(j => j.status === 'active').length

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const revenueThisMonth = allInvoices
    .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)

  const unpaidInvoices = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const overdueInvoices = allInvoices.filter(i => i.status === 'overdue')
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + parseFloat(i.total), 0)
  const unpaidCount = unpaidInvoices.length

  const sentEstimates = allEstimates.filter(e => ['sent', 'approved', 'rejected', 'converted', 'expired'].includes(e.status))
  const approvedEstimates = allEstimates.filter(e => ['approved', 'converted'].includes(e.status))
  const winRate = sentEstimates.length > 0 ? Math.round((approvedEstimates.length / sentEstimates.length) * 100) : null

  const stats = { activeJobs, revenueThisMonth, unpaidTotal, unpaidCount, winRate }

  // ── Alerts ──
  const alerts: { type: string; label: string; href: string }[] = []

  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((s, i) => s + parseFloat(i.total), 0)
    alerts.push({ type: 'error', label: `${overdueInvoices.length} invoice${overdueInvoices.length > 1 ? 's' : ''} overdue — $${formatCurrencyCompact(total)}`, href: '/invoices' })
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const staleEst = allEstimates.filter(e => e.status === 'sent' && new Date(e.updatedAt) < sevenDaysAgo)
  if (staleEst.length > 0) {
    alerts.push({ type: 'warning', label: `${staleEst.length} estimate${staleEst.length > 1 ? 's' : ''} pending 7+ days`, href: '/estimates' })
  }

  const jobMargins = allJobs.map(j => {
    const rev = allInvoices.filter(i => i.jobId === j.id && i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
    const cost = allExpenses.filter(e => e.jobId === j.id).reduce((s, e) => s + parseFloat(e.amount), 0)
    return { name: j.name, margin: rev > 0 ? ((rev - cost) / rev) * 100 : null }
  })
  const negJobs = jobMargins.filter(j => j.margin !== null && j.margin < 0)
  if (negJobs.length > 0) {
    alerts.push({ type: 'error', label: `${negJobs.length} job${negJobs.length > 1 ? 's' : ''} losing money`, href: '/jobs' })
  }

  // Estimates expiring within the next 3 days
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)
  const expiringEstimates = allEstimates.filter(e =>
    e.status === 'sent' && e.validUntil && new Date(e.validUntil) > now && new Date(e.validUntil) <= threeDaysFromNow,
  )
  if (expiringEstimates.length > 0) {
    alerts.push({ type: 'warning', label: `${expiringEstimates.length} estimate${expiringEstimates.length > 1 ? 's' : ''} expiring in ≤3 days`, href: '/estimates' })
  }

  // Active jobs with no start date (unscheduled work)
  const unscheduledJobs = allJobs.filter(j => j.status === 'active' && !j.startDate)
  if (unscheduledJobs.length > 0) {
    alerts.push({ type: 'warning', label: `${unscheduledJobs.length} active job${unscheduledJobs.length > 1 ? 's' : ''} without a scheduled date`, href: '/schedule' })
  }

  // Completed jobs with no invoice yet (uninvoiced work)
  const uninvoicedCompletedJobs = allJobs.filter(j => {
    if (j.status !== 'completed') return false
    return !allInvoices.some(inv => inv.jobId === j.id)
  })
  if (uninvoicedCompletedJobs.length > 0) {
    alerts.push({ type: 'warning', label: `${uninvoicedCompletedJobs.length} completed job${uninvoicedCompletedJobs.length > 1 ? 's' : ''} without an invoice`, href: '/jobs' })
  }

  // Shopping lists with pending materials — emergent alert (dismissable like the others)
  if (shopping.activeLists > 0 && shopping.pendingCost > 0) {
    const listsLabel = shopping.activeLists === 1 ? 'list' : 'lists'
    alerts.push({
      type: 'info',
      label: `${shopping.activeLists} active shopping ${listsLabel} · $${formatCurrencyCompact(shopping.pendingCost)} pending materials`,
      href: '/shopping-list',
    })
  }

  // ── Today's Schedule ──
  const todayJobs = allJobs
    .filter(j => isScheduledToday(j))
    .map(j => ({
      id: j.id,
      name: j.name,
      clientName: j.clientName,
      time: j.startDate ? new Date(j.startDate).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }) : null,
    }))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  // ── Active Jobs (for when no today schedule) ──
  const activeJobsList = allJobs
    .filter(j => j.status === 'active')
    .slice(0, 5)
    .map(j => ({ id: j.id, name: j.name, clientName: j.clientName }))

  // ── Revenue by Month (6 past + 3 projected) ──
  const overdueInvs = allInvoices.filter(i => i.status === 'overdue')
  const overdueSpread = overdueInvs.reduce((s, i) => s + parseFloat(i.total), 0) * 0.7 / 3
  const approvedEstNoInvoice = allEstimates.filter(e => e.status === 'approved' && !e.convertedToInvoiceId)
  const approvedSpread = approvedEstNoInvoice.reduce((s, e) => s + parseFloat(e.total), 0) * 0.8 / 3
  const sentEstForProjection = allEstimates.filter(e => e.status === 'sent')
  const sentSpread = sentEstForProjection.reduce((s, e) => s + parseFloat(e.total), 0) * ((winRate || 50) / 100) * 0.5 / 3

  // Past 6 months (actual revenue)
  const pastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const rev = allInvoices
      .filter(inv => inv.status === 'paid' && inv.paidAt && new Date(inv.paidAt) >= d && new Date(inv.paidAt) < end)
      .reduce((s, inv) => s + parseFloat(inv.total), 0)
    return { month: d.toLocaleString('en', { month: 'short' }), revenue: Math.round(rev), projected: 0 }
  })

  // Future 3 months (projected)
  const futureMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)

    // Invoices due this month
    const dueThisMonth = allInvoices.filter(inv =>
      inv.status === 'sent' && inv.dueDate &&
      new Date(inv.dueDate) >= d && new Date(inv.dueDate) < end
    )
    const dueTotal = dueThisMonth.reduce((s, inv) => s + parseFloat(inv.total), 0) * 0.9

    const projected = Math.round(dueTotal + overdueSpread + approvedSpread + sentSpread)
    return { month: d.toLocaleString('en', { month: 'short' }), revenue: 0, projected }
  })

  const revenueByMonth = [...pastMonths, ...futureMonths]

  // ── Due This Week ──
  const weekEnd = new Date(now.getTime() + 7 * 86400000)
  const dueThisWeek = allInvoices
    .filter(i => i.status === 'sent' && i.dueDate && new Date(i.dueDate) >= now && new Date(i.dueDate) <= weekEnd)
    .map(i => ({
      id: i.id,
      number: i.number,
      clientName: i.clientName,
      total: i.total,
      dueDay: new Date(i.dueDate!).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
    }))
    .sort((a, b) => a.dueDay.localeCompare(b.dueDay))

  // ── Money Pipeline: Pending → Unpaid → Paid (exclusive counts) ──
  const pendingCount = allEstimates.filter(e => ['sent', 'approved'].includes(e.status)).length
  const unpaidPipelineCount = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue').length
  const paidPipelineCount = allInvoices.filter(i => i.status === 'paid').length
  const pipeline = { pending: pendingCount, unpaid: unpaidPipelineCount, paid: paidPipelineCount }

  // ── AI Insights (when projection is weak) ──
  const avgProjected = futureMonths.reduce((s, m) => s + m.projected, 0) / 3
  const recentMonths = pastMonths.slice(-3)
  const monthsWithData = recentMonths.filter(m => m.revenue > 0).length
  const avgRecent = recentMonths.reduce((s, m) => s + m.revenue, 0) / 3
  // Only claim "X% below 3-month average" if there are ≥2 months with real revenue data —
  // with only 1 month the "average" is misleading.
  const projectionDown = monthsWithData >= 2 && avgRecent > 0 && avgProjected < avgRecent * 0.7
  const projectionZero = futureMonths.every(m => m.projected === 0)
  const prevMonthRevenue = pastMonths[pastMonths.length - 2]?.revenue || 0
  const thisMonthRevenue = pastMonths[pastMonths.length - 1]?.revenue || 0
  const revenueDrop = prevMonthRevenue > 0 && thisMonthRevenue < prevMonthRevenue * 0.7
  const pipelineEmpty = pendingCount === 0 && unpaidPipelineCount === 0

  // Build actionable insights independently of projection health — the buttons
  // (Create Estimate, Follow Up, Ask AI) are valuable even without a projection story.
  const insights: { text: string; href: string; label: string }[] = []
  const overdueTotal = overdueInvs.reduce((s, i) => s + parseFloat(i.total), 0)
  if (pendingCount < 3)
    insights.push({ text: `Low pipeline — only ${pendingCount} proposal${pendingCount !== 1 ? 's' : ''} pending`, href: '/estimates/new', label: 'Create Estimate' })
  if (overdueInvs.length > 0)
    insights.push({ text: `${overdueInvs.length} invoice${overdueInvs.length > 1 ? 's' : ''} overdue ($${formatCurrencyCompact(overdueTotal)}) — recover cash flow`, href: '/invoices', label: 'Follow Up' })
  if (allJobs.filter(j => j.status === 'lead' && new Date(j.createdAt) >= monthStart).length === 0)
    insights.push({ text: 'No new leads this month', href: '/jobs/new', label: 'Create Job' })
  if (winRate !== null && winRate < 40)
    insights.push({ text: `Low win rate (${winRate}%) — proposals aren't converting`, href: '/estimates', label: 'Review Estimates' })

  // Projection summary text — only emit specific claims when there's enough data.
  let projectionSummary = ''
  if (projectionZero || pipelineEmpty) projectionSummary = 'Your pipeline is empty — no projected revenue ahead.'
  else if (projectionDown) {
    const dropPct = Math.round((1 - avgProjected / avgRecent) * 100)
    projectionSummary = `Projected revenue is ${dropPct}% below your 3-month average.`
  } else if (revenueDrop) {
    const dropPct = Math.round((1 - thisMonthRevenue / prevMonthRevenue) * 100)
    projectionSummary = `Revenue dropped ${dropPct}% compared to last month.`
  } else if (insights.length > 0) {
    projectionSummary = 'Here are some things that need your attention.'
  }

  return (
    <DashboardStats
      stats={stats}
      alerts={alerts}
      todayJobs={todayJobs}
      activeJobs={activeJobsList}
      revenueByMonth={revenueByMonth}
      dueThisWeek={dueThisWeek}
      pipeline={pipeline}
      insights={insights.slice(0, 3)}
      projectionSummary={projectionSummary}
      translations={buildTranslations(t)}
    />
  )
}

function buildTranslations(t: any) {
  return {
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
  }
}
