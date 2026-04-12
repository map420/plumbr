import DashboardShell from './_components/DashboardShell'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro } from '@/lib/stripe'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const planData = await getUserPlan()
  return <DashboardShell pro={isPro(planData?.plan)}>{children}</DashboardShell>
}
