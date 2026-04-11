'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser } from './auth-helpers'

export async function updateProfile(data: { name: string; companyName: string; phone: string }) {
  const userId = await requireUser()
  await dbAdapter.users.update(userId, {
    name: data.name || null,
    companyName: data.companyName || null,
    phone: data.phone || null,
  })
}
