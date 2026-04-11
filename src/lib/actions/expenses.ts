'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import type { ExpenseType } from '@/lib/adapters/db/types'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getExpensesByJob(jobId: string) {
  const userId = await requireAuth()
  return dbAdapter.expenses.findByJob(jobId, userId)
}

export async function createExpense(jobId: string, data: {
  description: string; type: string; amount: string; date: string
}) {
  const userId = await requireAuth()
  const expense = await dbAdapter.expenses.create(userId, {
    jobId,
    description: data.description,
    type: data.type as ExpenseType,
    amount: data.amount,
    date: data.date ? new Date(data.date) : new Date(),
  })
  revalidatePath('/[locale]/jobs/[id]', 'page')
  return expense
}

export async function deleteExpense(id: string) {
  const userId = await requireAuth()
  await dbAdapter.expenses.delete(id, userId)
  revalidatePath('/[locale]/jobs/[id]', 'page')
}

// Returns sum of all expenses for a job as a string
export async function getActualCost(jobId: string): Promise<string> {
  const userId = await requireAuth()
  const items = await dbAdapter.expenses.findByJob(jobId, userId)
  const total = items.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  return total.toFixed(2)
}
