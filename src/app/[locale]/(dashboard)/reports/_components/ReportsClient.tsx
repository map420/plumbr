'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, DollarSign, Briefcase, Clock, AlertCircle } from 'lucide-react'

type MonthData = { label: string; revenue: number; cost: number }
type JobMargin = { id: string; name: string; clientName: string; revenue: number; cost: number; margin: number }
type LaborData = { id: string; name: string; hours: number; cost: number }
type ExpenseBreakdown = { type: string; total: number }

type ReportsData = {
  months: MonthData[]
  jobMargins: JobMargin[]
  laborByTech: LaborData[]
  expenseBreakdown: ExpenseBreakdown[]
  kpis: { totalRevenue: number; totalCost: number; netProfit: number; activeJobs: number; pendingRevenue: number }
}

const TYPE_COLORS: Record<string, string> = {
  labor: '#3B82F6',
  material: '#F59E0B',
  subcontractor: '#8B5CF6',
  other: '#94A3B8',
}

const TYPE_LABELS: Record<string, string> = {
  labor: 'Labor',
  material: 'Material',
  subcontractor: 'Subcontractor',
  other: 'Other',
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function KPICard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="plumbr-card p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const { months, jobMargins, laborByTech, expenseBreakdown, kpis } = data

  const hasData = kpis.totalRevenue > 0 || kpis.totalCost > 0

  return (
    <div className="p-4 md:p-8 max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total revenue" value={fmt(kpis.totalRevenue)} icon={DollarSign} color="text-emerald-600 bg-emerald-50" />
        <KPICard label="Net profit" value={fmt(kpis.netProfit)} icon={TrendingUp} color={kpis.netProfit >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-500 bg-red-50'} />
        <KPICard label="Active jobs" value={String(kpis.activeJobs)} icon={Briefcase} color="text-amber-600 bg-amber-50" />
        <KPICard label="Pending invoices" value={fmt(kpis.pendingRevenue)} icon={AlertCircle} color="text-purple-600 bg-purple-50" />
      </div>

      {!hasData && (
        <div className="plumbr-card p-12 text-center text-slate-400 text-sm">
          No financial data yet. Add expenses and mark invoices as paid to see your reports.
        </div>
      )}

      {hasData && (
        <>
          {/* Revenue vs Cost bar chart */}
          <div className="plumbr-card p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Revenue vs Cost — last 12 months</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Expense breakdown donut */}
            {expenseBreakdown.length > 0 && (
              <div className="plumbr-card p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Expense breakdown</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="total" nameKey="type" paddingAngle={2}>
                        {expenseBreakdown.map(entry => (
                          <Cell key={entry.type} fill={TYPE_COLORS[entry.type] ?? '#CBD5E1'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {expenseBreakdown.map(entry => (
                      <div key={entry.type} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: TYPE_COLORS[entry.type] ?? '#CBD5E1' }} />
                          <span className="text-slate-600">{TYPE_LABELS[entry.type] ?? entry.type}</span>
                        </div>
                        <span className="font-medium text-slate-700">{fmt(entry.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Labor by technician */}
            {laborByTech.length > 0 && (
              <div className="plumbr-card p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Labor by technician</h2>
                <div className="space-y-3">
                  {laborByTech.map(t => (
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{t.name}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10} />{t.hours.toFixed(1)} hrs</p>
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-slate-800 shrink-0">{fmt(t.cost)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top jobs table */}
          {jobMargins.length > 0 && (
            <div className="plumbr-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Top jobs by revenue</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium text-slate-400 text-xs">Job</th>
                      <th className="text-right px-5 py-2.5 font-medium text-slate-400 text-xs">Revenue</th>
                      <th className="text-right px-5 py-2.5 font-medium text-slate-400 text-xs">Cost</th>
                      <th className="text-right px-5 py-2.5 font-medium text-slate-400 text-xs">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jobMargins.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[220px]">{j.name}</p>
                          <p className="text-xs text-slate-400">{j.clientName}</p>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-700">{fmt(j.revenue)}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{fmt(j.cost)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${j.margin >= 30 ? 'bg-emerald-50 text-emerald-700' : j.margin >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                            {j.margin.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
