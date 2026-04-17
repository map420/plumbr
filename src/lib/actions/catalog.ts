'use server'

import { revalidatePath } from 'next/cache'
import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'
import { getUserPlan } from './billing'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import type { CatalogItemInput } from '@/lib/adapters/db/types'

export async function getCatalogItems() {
  const userId = await requireAuth()
  return dbAdapter.catalogItems.findAll(userId)
}

export async function createCatalogItem(data: CatalogItemInput) {
  const userId = await requireAuth()

  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    const existing = await dbAdapter.catalogItems.findAll(userId)
    if (existing.length >= STARTER_LIMITS.catalogItems) {
      throw new Error(`PLAN_LIMIT: Upgrade to Pro to save more than ${STARTER_LIMITS.catalogItems} catalog items.`)
    }
  }

  if (!data.name?.trim()) throw new Error('Item name is required.')

  const item = await dbAdapter.catalogItems.create(userId, data)
  revalidatePath('/[locale]/settings', 'page')
  return item
}

export async function updateCatalogItem(id: string, data: Partial<CatalogItemInput>) {
  const userId = await requireAuth()
  const item = await dbAdapter.catalogItems.update(id, userId, data)
  revalidatePath('/[locale]/settings', 'page')
  return item
}

export async function deleteCatalogItem(id: string) {
  const userId = await requireAuth()
  await dbAdapter.catalogItems.delete(id, userId)
  revalidatePath('/[locale]/settings', 'page')
}
