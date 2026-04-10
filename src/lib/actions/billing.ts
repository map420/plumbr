'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import { paymentsAdapter } from '@/lib/adapters/payments'
import { PLANS } from '@/lib/stripe'
import { headers } from 'next/headers'

async function requireUser(locale: string) {
  const { userId } = await auth()
  if (!userId) redirect(`/${locale}/sign-in`)

  const rows = await db.select().from(users).where(eq(users.id, userId))
  if (rows[0]) return rows[0]

  // User not in DB yet — create from Clerk data
  const clerkUser = await currentUser()
  if (!clerkUser) redirect(`/${locale}/sign-in`)

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const [newUser] = await db.insert(users).values({
    id: userId,
    email,
    name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
  }).returning()
  return newUser
}

function getOrigin(headersList: Awaited<ReturnType<typeof headers>>) {
  return headersList.get('origin') ?? 'https://plumbr.vercel.app'
}

export async function createCheckoutSession(locale: string) {
  const user = await requireUser(locale)
  const headersList = await headers()
  const origin = getOrigin(headersList)

  let customerId = user.stripeCustomerId

  if (!customerId) {
    const customer = await paymentsAdapter.createCustomer({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id))
  }

  const { url } = await paymentsAdapter.createCheckoutSession({
    customerId,
    priceId: PLANS.pro.priceId,
    trialDays: 14,
    successUrl: `${origin}/${locale}/dashboard?upgraded=1`,
    cancelUrl: `${origin}/${locale}/pricing`,
    metadata: { userId: user.id, locale },
  })

  redirect(url)
}

export async function createPortalSession(locale: string) {
  const user = await requireUser(locale)
  if (!user.stripeCustomerId) redirect(`/${locale}/pricing`)

  const headersList = await headers()
  const origin = getOrigin(headersList)

  const { url } = await paymentsAdapter.createPortalSession({
    customerId: user.stripeCustomerId!,
    returnUrl: `${origin}/${locale}/settings`,
  })

  redirect(url)
}

export async function getUserPlan() {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await db.select({ plan: users.plan, stripeSubscriptionId: users.stripeSubscriptionId })
    .from(users).where(eq(users.id, userId))
  return rows[0] ?? null
}
