import DashboardShell from './_components/DashboardShell'
import { CommandPalette } from '@/components/CommandPalette'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro } from '@/lib/stripe'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const planData = await getUserPlan()
  const isProPlan = isPro(planData?.plan)
  return (
    <DashboardShell pro={isProPlan}>
      {children}
      <CommandPalette />
    </DashboardShell>
  )
}
