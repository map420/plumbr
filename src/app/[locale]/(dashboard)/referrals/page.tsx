import { getReferrals } from '@/lib/actions/referrals'
import { requireUser } from '@/lib/actions/auth-helpers'
import { ReferralsClient } from './_components/ReferralsClient'

export default async function ReferralsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [referrals, userId] = await Promise.all([getReferrals(), requireUser()])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
  const referralLink = `${appUrl}/${locale}/sign-up?ref=${encodeURIComponent(userId)}`

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Referrals</h1>
      <p className="text-sm text-slate-600 mb-6">Invite other contractors and earn credit when they subscribe.</p>
      <ReferralsClient referrals={referrals} referralLink={referralLink} />
    </div>
  )
}
