'use server'

import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { revalidatePath } from 'next/cache'

async function requireAuth() {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export async function getClients() {
  const userId = await requireAuth()
  return dbAdapter.clients.findAll(userId)
}

export async function getClient(id: string) {
  const userId = await requireAuth()
  return dbAdapter.clients.findById(id, userId)
}

export async function createClient(data: {
  name: string; email: string; phone: string; address: string; notes: string
}) {
  const userId = await requireAuth()
  const client = await dbAdapter.clients.create(userId, {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    notes: data.notes || null,
  })
  revalidatePath('/[locale]/clients', 'page')
  return client
}

export async function updateClient(id: string, data: Partial<{
  name: string; email: string; phone: string; address: string; notes: string
}>) {
  const userId = await requireAuth()
  const client = await dbAdapter.clients.update(id, userId, {
    ...data.name !== undefined && { name: data.name },
    ...data.email !== undefined && { email: data.email || null },
    ...data.phone !== undefined && { phone: data.phone || null },
    ...data.address !== undefined && { address: data.address || null },
    ...data.notes !== undefined && { notes: data.notes || null },
  })
  revalidatePath('/[locale]/clients', 'page')
  return client
}

export async function deleteClient(id: string) {
  const userId = await requireAuth()
  await dbAdapter.clients.delete(id, userId)
  revalidatePath('/[locale]/clients', 'page')
}
