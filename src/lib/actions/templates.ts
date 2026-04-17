'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'
import { isPro } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { requireUser as requireAuth } from './auth-helpers'
import type { EstimateTemplateInput } from '@/lib/adapters/db/types'

async function requirePro() {
  const userId = await requireAuth()
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    throw new Error('PLAN_LIMIT: Upgrade to Pro to use Estimate Templates.')
  }
  return userId
}

export async function getTemplates() {
  const userId = await requirePro()
  return dbAdapter.estimateTemplates.findAll(userId)
}

export async function createTemplate(data: EstimateTemplateInput) {
  const userId = await requirePro()
  if (!data.name?.trim()) throw new Error('Template name is required.')
  const template = await dbAdapter.estimateTemplates.create(userId, data)
  revalidatePath('/[locale]/settings', 'page')
  return template
}

export async function deleteTemplate(id: string) {
  const userId = await requirePro()
  await dbAdapter.estimateTemplates.delete(id, userId)
  revalidatePath('/[locale]/settings', 'page')
}
