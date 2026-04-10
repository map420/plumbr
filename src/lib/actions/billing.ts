'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import { getStripe, PLANS } from '@/lib/stripe'
import { headers } from 'next/headers'

async function requireUser(locale: string) {
  const { userId } = await auth()
  if (!userId) redirect(`/${locale}/sign-in`)

  // Try to find user in DB
  const rows = await db.select().from(users).where(eq(users.id, userId))
  if (rows[0]) return rows[0]

  // User not in DB yet (Clerk webhook hasn't fired) — create from Clerk data
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

export async function createCheckoutSession(locale: string) {
  const user = await requireUser(locale)
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'https://plumbr.vercel.app'

  let customerId = user.stripeCustomerId

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id))
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLANS.pro.priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${origin}/${locale}/dashboard?upgraded=1`,
    cancel_url: `${origin}/${locale}/pricing`,
    metadata: { userId: user.id, locale },
  })

  redirect(session.url!)
}

export async function createPortalSession(locale: string) {
  const user = await requireUser(locale)
  if (!user.stripeCustomerId) redirect(`/${locale}/pricing`)

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'https://plumbr.vercel.app'

  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${origin}/${locale}/settings`,
  })

  redirect(session.url)
}

export async function getUserPlan() {
  const { userId } = await auth()
  if (!userId) return null
  const rows = await db.select({ plan: users.plan, stripeSubscriptionId: users.stripeSubscriptionId }).from(users).where(eq(users.id, userId))
  return rows[0] ?? null
}
