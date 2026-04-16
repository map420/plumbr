'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { authAdapter } from '@/lib/adapters/auth'
import { dbAdapter } from '@/lib/adapters/db'
import { paymentsAdapter } from '@/lib/adapters/payments'
import { PLANS } from '@/lib/stripe'

async function requireUser(locale: string) {
  const userId = await authAdapter.getUserId()
  if (!userId) redirect(`/${locale}/sign-in`)

  const user = await dbAdapter.users.findById(userId)
  if (user) return user

  let email = `${userId}@local.dev`
  let name: string | null = null

  if (process.env.CLERK_SECRET_KEY) {
    const { currentUser } = await import('@clerk/nextjs/server')
    const clerkUser = await currentUser()
    if (!clerkUser) redirect(`/${locale}/sign-in`)
    email = clerkUser.emailAddresses[0]?.emailAddress ?? email
    name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
  }

  return dbAdapter.users.upsert({ id: userId, email, name, companyName: null, phone: null, plan: null, stripeCustomerId: null, stripeSubscriptionId: null, logoUrl: null, taxRate: null, documentFooter: null, paymentTerms: null, acceptAch: null, coverProcessingFee: null, licenseNumber: null, licenseState: null, insuranceInfo: null, websiteUrl: null, socialLinks: null, showCredentialsOnDocs: null, smsEnabled: null, smsPhoneNumber: null } as any)
}

function getOrigin(headersList: Awaited<ReturnType<typeof headers>>) {
  return headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
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
    await dbAdapter.users.update(user.id, { stripeCustomerId: customerId })
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
