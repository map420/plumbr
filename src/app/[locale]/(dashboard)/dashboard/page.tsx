import { getTranslations } from 'next-intl/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { jobs } from '@/db/schema/jobs'
import { estimates } from '@/db/schema/estimates'
import { invoices } from '@/db/schema/invoices'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { DashboardStats } from './_components/DashboardStats'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const { userId } = await auth()

  let stats = { activeJobs: 0, openEstimates: 0, revenueThisMonth: 0, avgMargin: null as number | null }

  if (userId) {
    const [allJobs, allEstimates, allInvoices] = await Promise.all([
      db.select().from(jobs).where(eq(jobs.userId, userId)),
      db.select().from(estimates).where(eq(estimates.userId, userId)),
      db.select().from(invoices).where(eq(invoices.userId, userId)),
    ])

    const activeJobs = allJobs.filter((j) => j.status === 'active').length
    const openEstimates = allEstimates.filter((e) => ['draft', 'sent'].includes(e.status)).length

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const revenueThisMonth = allInvoices
      .filter((inv) => inv.status === 'paid' && inv.paidAt && new Date(inv.paidAt) >= monthStart)
      .reduce((sum, inv) => sum + parseFloat(inv.total), 0)

    const jobsWithBudget = allJobs.filter((j) => parseFloat(j.budgetedCost ?? '0') > 0)
    const avgMargin = jobsWithBudget.length > 0
      ? jobsWithBudget.reduce((sum, j) => {
          const budget = parseFloat(j.budgetedCost ?? '0')
          const actual = parseFloat(j.actualCost ?? '0')
          return sum + ((budget - actual) / budget) * 100
        }, 0) / jobsWithBudget.length
      : null

    stats = { activeJobs, openEstimates, revenueThisMonth, avgMargin }
  }

  return (
    <DashboardStats
      stats={stats}
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
