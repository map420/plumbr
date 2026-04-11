import { getTranslations } from 'next-intl/server'
import { getUserPlan } from '@/lib/actions/billing'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { SettingsClient } from './_components/SettingsClient'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, userPlan, userId] = await Promise.all([getTranslations('nav'), getUserPlan(), requireUser()])
  const user = await dbAdapter.users.findById(userId)

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <SettingsClient
        locale={locale}
        plan={userPlan?.plan ?? 'starter'}
        hasSubscription={!!userPlan?.stripeSubscriptionId}
        profile={{ name: user?.name ?? '', companyName: user?.companyName ?? '', phone: user?.phone ?? '' }}
      />
    </div>
  )
}
