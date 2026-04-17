'use server'

import { revalidatePath } from 'next/cache'
import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'

export async function getContracts() {
  const userId = await requireAuth()
  return dbAdapter.contracts.findAll(userId)
}

export async function createContract(data: { name: string; content: string; isDefault?: boolean }) {
  const userId = await requireAuth()
  if (!data.name?.trim()) throw new Error('Contract name is required.')
  if (!data.content?.trim()) throw new Error('Contract content is required.')
  const contract = await dbAdapter.contracts.create(userId, data)
  revalidatePath('/[locale]/settings', 'page')
  return contract
}

export async function updateContract(id: string, data: Partial<{ name: string; content: string; isDefault: boolean }>) {
  const userId = await requireAuth()
  const contract = await dbAdapter.contracts.update(id, userId, data)
  revalidatePath('/[locale]/settings', 'page')
  return contract
}

export async function deleteContract(id: string) {
  const userId = await requireAuth()
  await dbAdapter.contracts.delete(id, userId)
  revalidatePath('/[locale]/settings', 'page')
}
