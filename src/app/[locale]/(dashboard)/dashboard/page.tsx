import { getTranslations } from 'next-intl/server'
import { DashboardClient } from './_components/DashboardClient'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  return (
    <DashboardClient
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
