'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useLocale } from 'next-intl'
import { DollarSign, Briefcase, FileText, TrendingUp, Target, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

type T = {
  greeting: string; subtitle: string
  stats: { activeJobs: string; openEstimates: string; revenueThisMonth: string; avgJobMargin: string }
  quickActions: { title: string; newEstimate: string; newJob: string }
}
type Stats = { activeJobs: number; openEstimates: number; revenueThisMonth: number; avgMargin: number | null }
type ChartData = {
  revenueByMonth: { month: string; revenue: number }[]
  jobsByStatus: { status: string; count: number }[]
  conversionRate: number
  topClients: { name: string; revenue: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  lead: '#94a3b8', active: '#3b82f6', on_hold: '#f59e0b',
  completed: '#22c55e', cancelled: '#ef4444',
}

const CHART_COLORS = ['#1E3A5F', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']

export function DashboardStats({ stats, chartData, translations: t }: {
  stats: Stats; chartData: ChartData; translations: T
}) {
  const locale = useLocale()
  const { user } = useUser()
  const firstName = user?.firstName ?? 'there'
  const greeting = t.greeting.replace('{name}', firstName)

  const statCards = [
    { label: t.stats.activeJobs, value: String(stats.activeJobs), icon: Briefcase, color: 'text-blue-600' },
    { label: t.stats.openEstimates, value: String(stats.openEstimates), icon: FileText, color: 'text-orange-500' },
    { label: t.stats.revenueThisMonth, value: stats.revenueThisMonth > 0 ? `$${stats.revenueThisMonth.toLocaleString()}` : '—', icon: DollarSign, color: 'text-green-600' },
    { label: t.stats.avgJobMargin, value: stats.avgMargin !== null ? `${Math.round(stats.avgMargin)}%` : '—', icon: TrendingUp, color: 'text-purple-600' },
  ]

  const hasRevenueData = chartData.revenueByMonth.some(m => m.revenue > 0)
  const hasJobData = chartData.jobsByStatus.length > 0
  const hasClientData = chartData.topClients.length > 0

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting} 👷</h1>
        <p className="text-slate-500 mt-1">{t.subtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
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

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue by month */}
        <div className="col-span-2 plumbr-card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Revenue — Last 6 Months</h2>
          {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.revenueByMonth} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No paid invoices yet</div>
          )}
        </div>

        {/* Jobs by status */}
        <div className="plumbr-card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Jobs by Status</h2>
          {hasJobData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData.jobsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {chartData.jobsByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No jobs yet</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Conversion rate */}
        <div className="plumbr-card p-5 flex flex-col items-center justify-center text-center">
          <Target size={28} className="text-[#1E3A5F] mb-3" />
          <p className="text-3xl font-bold text-slate-900">{chartData.conversionRate}%</p>
          <p className="text-sm text-slate-500 mt-1">Lead → Active Conversion</p>
        </div>

        {/* Top clients */}
        <div className="col-span-2 plumbr-card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Users size={15} /> Top 5 Clients by Revenue</h2>
          {hasClientData ? (
            <div className="space-y-3">
              {chartData.topClients.map((c, i) => {
                const max = chartData.topClients[0].revenue
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 truncate">{c.name}</span>
                        <span className="font-semibold text-slate-900 ml-2">${c.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${(c.revenue / max) * 100}%`, backgroundColor: CHART_COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">No revenue data yet</div>
          )}
        </div>
      </div>

      {/* Quick actions */}
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
