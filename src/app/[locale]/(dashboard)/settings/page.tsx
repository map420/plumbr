import { getTranslations } from 'next-intl/server'
import { getUserPlan } from '@/lib/actions/billing'
import { SettingsClient } from './_components/SettingsClient'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, userPlan] = await Promise.all([getTranslations('nav'), getUserPlan()])

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <SettingsClient locale={locale} plan={userPlan?.plan ?? 'starter'} hasSubscription={!!userPlan?.stripeSubscriptionId} />
    </div>
  )
}
