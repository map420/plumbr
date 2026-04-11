import { getTechnicians } from '@/lib/actions/technicians'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro } from '@/lib/stripe'
import { TeamClient } from './_components/TeamClient'

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [technicians, planData] = await Promise.all([getTechnicians(), getUserPlan()])
  const pro = isPro(planData?.plan)
  return <TeamClient initialTechnicians={technicians} isPro={pro} locale={locale} />
}
