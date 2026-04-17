'use server'
import { requireUser as requireAuth } from './auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'

export async function getReferrals() {
  const userId = await requireAuth()
  return dbAdapter.referrals.findByReferrer(userId)
}

export async function createReferral(referredEmail: string) {
  const userId = await requireAuth()
  return dbAdapter.referrals.create(userId, { referredEmail })
}
