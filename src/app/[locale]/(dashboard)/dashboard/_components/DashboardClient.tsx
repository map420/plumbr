'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getJobs } from '@/lib/store/jobs'
import { getEstimates } from '@/lib/store/estimates'
import { getInvoices } from '@/lib/store/invoices'
import { KpiCard } from '@/components/ui'

type T = {
  greeting: string; subtitle: string
  stats: { activeJobs: string; openEstimates: string; revenueThisMonth: string; avgJobMargin: string }
  quickActions: { title: string; newEstimate: string; newJob: string }
}

export function DashboardClient({ translations: t }: { translations: T }) {
  const locale = useLocale()
  const [stats, setStats] = useState({ activeJobs: 0, openEstimates: 0, revenueThisMonth: 0, avgMargin: null as number | null })

  useEffect(() => {
    const jobs = getJobs()
    const estimates = getEstimates()
    const invoices = getInvoices()

    const activeJobs = jobs.filter((j) => j.status === 'active').length
    const openEstimates = estimates.filter((e) => ['draft', 'sent'].includes(e.status)).length

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const revenueThisMonth = invoices
      .filter((inv) => inv.status === 'paid' && inv.paidAt && new Date(inv.paidAt) >= monthStart)
      .reduce((sum, inv) => sum + inv.total, 0)

    const jobsWithBudget = jobs.filter((j) => j.budgetedCost > 0)
    const avgMargin = jobsWithBudget.length > 0
      ? jobsWithBudget.reduce((sum, j) => sum + ((j.budgetedCost - j.actualCost) / j.budgetedCost) * 100, 0) / jobsWithBudget.length
      : null

    setStats({ activeJobs, openEstimates, revenueThisMonth, avgMargin })
  }, [])

  // Replace {name} placeholder in greeting with 'there' until Clerk is connected
  const greeting = t.greeting.replace('{name}', 'there')

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--wp-text)' }}>{greeting} 👷</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--wp-text-2)' }}>{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          tone="info"
          label={t.stats.activeJobs}
          value={stats.activeJobs}
        />
        <KpiCard
          tone="warning"
          label={t.stats.openEstimates}
          value={stats.openEstimates}
        />
        <KpiCard
          tone="success"
          label={t.stats.revenueThisMonth}
          value={stats.revenueThisMonth > 0 ? `$${stats.revenueThisMonth.toFixed(2)}` : '—'}
          subTone={stats.revenueThisMonth > 0 ? 'up' : 'neutral'}
        />
        <KpiCard
          tone="brand"
          label={t.stats.avgJobMargin}
          value={stats.avgMargin !== null ? `${Math.round(stats.avgMargin)}%` : '—'}
        />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--wp-text)' }}>{t.quickActions.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/${locale}/estimates/new`} className="btn-primary btn-sm">{t.quickActions.newEstimate}</Link>
          <Link href={`/${locale}/jobs/new`} className="btn-secondary btn-sm">{t.quickActions.newJob}</Link>
        </div>
      </div>
    </div>
  )
}
