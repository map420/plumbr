import { cache } from 'react'
import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'

/**
 * Wrapped with React.cache() so repeated calls in the same request (layout +
 * page + various RSCs) dedupe to a single DB round-trip.
 */
export const getUserPlan = cache(async () => {
  const userId = await authAdapter.getUserId()
  if (!userId) return null
  const user = await dbAdapter.users.findById(userId)
  const plan = user?.plan ?? process.env.MOCK_USER_PLAN ?? null
  return { plan, stripeSubscriptionId: user?.stripeSubscriptionId ?? null }
})
