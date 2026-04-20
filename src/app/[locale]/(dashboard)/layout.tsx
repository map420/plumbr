import { ClerkProvider } from '@clerk/nextjs'
import DashboardShell from './_components/DashboardShell'
import { CommandPalette } from '@/components/CommandPalette'
import { DevTools } from '@/components/DevTools'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro } from '@/lib/stripe'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const planData = await getUserPlan()
  const isProPlan = isPro(planData?.plan)
  const showDevTools = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_TOOLS === 'true'
  return (
    <ClerkProvider>
      <DashboardShell pro={isProPlan}>
        {children}
        <CommandPalette />
        {showDevTools && <DevTools />}
      </DashboardShell>
    </ClerkProvider>
  )
}
