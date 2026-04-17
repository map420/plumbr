import { getUserPlan } from '@/lib/actions/billing'
import { isPro } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import { getInvoices } from '@/lib/actions/invoices'
import { getEstimates } from '@/lib/actions/estimates'
import { AssistantPageClient } from './_components/AssistantPageClient'

export type Alert = { type: 'overdue' | 'stale' | 'inactive'; label: string; message: string }

async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = []
  try {
    const [invoices, estimates] = await Promise.all([getInvoices(), getEstimates()])
    const now = Date.now()

    const overdue = invoices.filter(i => i.status === 'sent' && i.dueDate && new Date(i.dueDate).getTime() < now)
    if (overdue.length > 0) {
      const total = overdue.reduce((s, i) => s + parseFloat(i.total), 0)
      alerts.push({
        type: 'overdue',
        label: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue — $${total.toLocaleString('en', { minimumFractionDigits: 0 })}`,
        message: 'Show me all overdue invoices with amounts and days overdue, and help me follow up.',
      })
    }

    const stale = estimates.filter(e => {
      if (e.status !== 'sent') return false
      const sent = new Date(e.createdAt).getTime()
      return (now - sent) > 7 * 86400000
    })
    if (stale.length > 0) {
      alerts.push({
        type: 'stale',
        label: `${stale.length} estimate${stale.length > 1 ? 's' : ''} pending 7+ days`,
        message: 'Show me estimates that have been pending for 7+ days and help me follow up.',
      })
    }
  } catch {}
  return alerts.slice(0, 3)
}

export default async function AssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    redirect(`/${locale}/settings`)
  }
  const alerts = await getAlerts()
  return <AssistantPageClient alerts={alerts} />
}
