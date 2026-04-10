import { currentUser } from '@clerk/nextjs/server'
import { DollarSign, Briefcase, FileText, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Active Jobs', value: '—', icon: Briefcase, color: 'text-blue-600' },
  { label: 'Open Estimates', value: '—', icon: FileText, color: 'text-orange-500' },
  { label: 'Revenue This Month', value: '—', icon: DollarSign, color: 'text-green-600' },
  { label: 'Avg. Job Margin', value: '—', icon: TrendingUp, color: 'text-purple-600' },
]

export default async function DashboardPage() {
  const user = await currentUser()
  const firstName = user?.firstName ?? 'there'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {firstName} 👷</h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="plumbr-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="plumbr-card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <a href="/estimates/new" className="btn-primary text-sm">+ New Estimate</a>
          <a href="/jobs/new" className="btn-secondary text-sm">+ New Job</a>
        </div>
      </div>
    </div>
  )
}
