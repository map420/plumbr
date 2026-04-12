import { getAllExpenses } from '@/lib/actions/expenses'
import { getJobs } from '@/lib/actions/jobs'
import { getTechnicians } from '@/lib/actions/technicians'
import { ExpensesGlobalClient } from './_components/ExpensesGlobalClient'

export default async function ExpensesPage() {
  const [expenses, jobs, technicians] = await Promise.all([
    getAllExpenses(),
    getJobs(),
    getTechnicians(),
  ])

  return (
    <ExpensesGlobalClient
      initialExpenses={expenses}
      jobs={jobs}
      technicians={technicians}
    />
  )
}
