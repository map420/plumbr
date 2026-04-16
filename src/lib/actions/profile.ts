'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser } from './auth-helpers'

export async function updateProfile(data: { name: string; companyName: string; phone: string; logoUrl?: string; taxRate?: string; documentFooter?: string; paymentTerms?: string }) {
  const userId = await requireUser()
  await dbAdapter.users.update(userId, {
    name: data.name || null,
    companyName: data.companyName || null,
    phone: data.phone || null,
    logoUrl: data.logoUrl || null,
    taxRate: data.taxRate || null,
    documentFooter: data.documentFooter || null,
    paymentTerms: data.paymentTerms || 'net30',
  })
}

/** Returns the current user's profile row, or null if missing. */
export async function getCurrentUserProfile() {
  const userId = await requireUser()
  return dbAdapter.users.findById(userId)
}
