// Server-only helper (no 'use server' — this is not a server action, it's
// called internally by RSCs and other server actions). Removing 'use server'
// lets us wrap the function with React.cache() so multiple calls inside the
// same request dedupe to a single Clerk auth() + a single users.findById.
import 'server-only'
import { cache } from 'react'
import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'

/**
 * Returns userId and ensures the user row exists in the DB.
 * Call this instead of bare authAdapter.getUserId() in any action that writes data.
 *
 * Wrapped with React.cache() so a page that triggers both a layout RSC and
 * multiple server actions only pays the auth() + DB lookup cost once per
 * request.
 */
export const requireUser = cache(async (): Promise<string> => {
  const userId = await authAdapter.getUserId()
  if (!userId) throw new Error('Unauthorized')

  // Ensure user exists in DB (auto-create on first use)
  const existing = await dbAdapter.users.findById(userId)
  if (!existing) {
    let email = `${userId}@local.dev`
    let name: string | null = null

    if (process.env.CLERK_SECRET_KEY) {
      const { currentUser } = await import('@clerk/nextjs/server')
      const clerkUser = await currentUser()
      if (clerkUser) {
        email = clerkUser.emailAddresses[0]?.emailAddress ?? email
        name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
      }
    }

    await dbAdapter.users.upsert({
      id: userId, email, name,
      companyName: null, phone: null,
      plan: null, stripeCustomerId: null, stripeSubscriptionId: null,
      logoUrl: null, taxRate: null, documentFooter: null, paymentTerms: null,
      acceptAch: null, coverProcessingFee: null,
      licenseNumber: null, licenseState: null, insuranceInfo: null,
      websiteUrl: null, socialLinks: null, showCredentialsOnDocs: null,
      smsEnabled: null, smsPhoneNumber: null,
    } as any)
  }

  return userId
})
