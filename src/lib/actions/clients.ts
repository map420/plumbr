'use server'
import { requireUser as requireAuth } from './auth-helpers'


import { dbAdapter } from '@/lib/adapters/db'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { revalidatePath } from 'next/cache'


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

  // Prevent duplicates: same email (primary key signal) OR same name+address fallback.
  const existing = await dbAdapter.clients.findAll(userId)
  const emailNorm = data.email?.trim().toLowerCase()
  const nameNorm = data.name?.trim().toLowerCase()
  const addressNorm = data.address?.trim().toLowerCase()
  if (emailNorm) {
    const dupe = existing.find(c => (c.email ?? '').toLowerCase() === emailNorm)
    if (dupe) throw new Error(`DUPLICATE_CLIENT: "${dupe.name}" already exists with this email.`)
  } else if (nameNorm && addressNorm) {
    const dupe = existing.find(c => c.name.toLowerCase() === nameNorm && (c.address ?? '').toLowerCase() === addressNorm)
    if (dupe) throw new Error(`DUPLICATE_CLIENT: "${dupe.name}" already exists at this address.`)
  }

  // Plan enforcement — same pattern as jobs/estimates
  const planData = await getUserPlan()
  if (!isPro(planData?.plan) && existing.length >= STARTER_LIMITS.clients) {
    throw new Error(`PLAN_LIMIT: Upgrade to Pro to create more than ${STARTER_LIMITS.clients} clients.`)
  }

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
