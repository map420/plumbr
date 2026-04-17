import { getShoppingList } from '@/lib/actions/shopping-lists'
import { getJob } from '@/lib/actions/jobs'
import { getExpensesByJob } from '@/lib/actions/expenses'
import { getEstimatesByJob, getLineItems } from '@/lib/actions/estimates'
import { redirect } from 'next/navigation'
import { ShoppingListDetailClient } from './_components/ShoppingListDetailClient'

export default async function ShoppingListDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const list = await getShoppingList(id)
  if (!list) redirect(`/${locale}/shopping-list`)

  let materialBudget = 0
  let materialSpent = 0
  let job: { id: string; name: string; clientName: string; status: string } | null = null
  let estimate: { id: string; number: string } | null = null

  if (list.jobId) {
    const [jobData, expenses, estimates] = await Promise.all([
      getJob(list.jobId),
      getExpensesByJob(list.jobId),
      getEstimatesByJob(list.jobId),
    ])

    if (jobData) {
      job = { id: jobData.id, name: jobData.name, clientName: jobData.clientName, status: jobData.status }
    }

    materialSpent = expenses
      .filter(e => e.type === 'material')
      .reduce((s, e) => s + parseFloat(e.amount), 0)

    // Prefer latest approved/sent estimate's material line items for budget
    const relevantEst = estimates.find(e => ['approved', 'converted', 'sent'].includes(e.status)) || estimates[0]
    if (relevantEst) {
      estimate = { id: relevantEst.id, number: relevantEst.number }
      const lineItems = await getLineItems(relevantEst.id)
      materialBudget = lineItems
        .filter(li => li.type === 'material')
        .reduce((s, li) => s + parseFloat(li.total), 0)
    }

    // Fallback: use job's budgetedCost if no estimate materials found
    if (materialBudget === 0 && jobData) {
      materialBudget = parseFloat((jobData.budgetedCost as unknown as string) || '0')
    }
  }

  return (
    <ShoppingListDetailClient
      list={list}
      job={job}
      estimate={estimate}
      materialBudget={materialBudget}
      materialSpent={materialSpent}
    />
  )
}
