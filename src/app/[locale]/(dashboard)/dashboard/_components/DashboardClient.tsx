'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { getJobs } from '@/lib/store/jobs'
import { getEstimates } from '@/lib/store/estimates'
import { getInvoices } from '@/lib/store/invoices'
import { DollarSign, Briefcase, FileText, TrendingUp } from 'lucide-react'

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

  const statCards = [
    { label: t.stats.activeJobs, value: String(stats.activeJobs), icon: Briefcase, color: 'text-blue-600' },
    { label: t.stats.openEstimates, value: String(stats.openEstimates), icon: FileText, color: 'text-orange-500' },
    { label: t.stats.revenueThisMonth, value: stats.revenueThisMonth > 0 ? `$${stats.revenueThisMonth.toLocaleString()}` : '—', icon: DollarSign, color: 'text-green-600' },
    { label: t.stats.avgJobMargin, value: stats.avgMargin !== null ? `${Math.round(stats.avgMargin)}%` : '—', icon: TrendingUp, color: 'text-purple-600' },
  ]

  // Replace {name} placeholder in greeting with 'there' until Clerk is connected
  const greeting = t.greeting.replace('{name}', 'there')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{greeting} 👷</h1>
        <p className="text-slate-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="plumbr-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="plumbr-card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">{t.quickActions.title}</h2>
        <div className="flex gap-3">
          <Link href={`/${locale}/estimates/new`} className="btn-primary text-sm">{t.quickActions.newEstimate}</Link>
          <Link href={`/${locale}/jobs/new`} className="btn-secondary text-sm">{t.quickActions.newJob}</Link>
        </div>
      </div>
    </div>
  )
}
