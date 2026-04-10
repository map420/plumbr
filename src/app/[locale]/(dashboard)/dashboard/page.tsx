import { getTranslations } from 'next-intl/server'
import { DollarSign, Briefcase, FileText, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')

  const stats = [
    { label: t('stats.activeJobs'), value: '—', icon: Briefcase, color: 'text-blue-600' },
    { label: t('stats.openEstimates'), value: '—', icon: FileText, color: 'text-orange-500' },
    { label: t('stats.revenueThisMonth'), value: '—', icon: DollarSign, color: 'text-green-600' },
    { label: t('stats.avgJobMargin'), value: '—', icon: TrendingUp, color: 'text-purple-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{t('greeting', { name: 'there' })} 👷</h1>
        <p className="text-slate-500 mt-1">{t('subtitle')}</p>
      </div>

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

      <div className="plumbr-card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">{t('quickActions.title')}</h2>
        <div className="flex gap-3">
          <a href="estimates/new" className="btn-primary text-sm">{t('quickActions.newEstimate')}</a>
          <a href="jobs/new" className="btn-secondary text-sm">{t('quickActions.newJob')}</a>
        </div>
      </div>
    </div>
  )
}
