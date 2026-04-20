'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser } from './auth-helpers'
import { getStripe } from '@/lib/stripe'

export async function getStripeConnectionInfo(): Promise<{
  connected: boolean
  paymentMethodLast4?: string
  paymentMethodBrand?: string
}> {
  const userId = await requireUser()
  const user = await dbAdapter.users.findById(userId)
  if (!user?.stripeCustomerId) return { connected: false }

  try {
    const stripe = getStripe()
    const methods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 1 })
    const first = methods.data[0]
    return {
      connected: true,
      paymentMethodLast4: first?.card?.last4,
      paymentMethodBrand: first?.card?.brand,
    }
  } catch {
    return { connected: true }
  }
}

export async function getStripeBillingInfo(): Promise<{
  plan: 'starter' | 'pro'
  nextBillingDate: Date | null
  interval: 'month' | 'year' | null
  amount: number | null
  cancelAtPeriodEnd: boolean
}> {
  const userId = await requireUser()
  const user = await dbAdapter.users.findById(userId)
  const plan = user?.plan === 'pro' ? 'pro' : 'starter'

  if (plan !== 'pro' || !user?.stripeSubscriptionId) {
    return { plan, nextBillingDate: null, interval: null, amount: null, cancelAtPeriodEnd: false }
  }

  try {
    const stripe = getStripe()
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
    const item = sub.items.data[0]
    const price = item?.price
    // `current_period_end` exists on all subscriptions; types sometimes lag
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
    return {
      plan,
      nextBillingDate: periodEnd ? new Date(periodEnd * 1000) : null,
      interval: (price?.recurring?.interval as 'month' | 'year') ?? null,
      amount: price?.unit_amount ? price.unit_amount / 100 : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    }
  } catch {
    return { plan, nextBillingDate: null, interval: null, amount: null, cancelAtPeriodEnd: false }
  }
}

export async function disconnectQbo(): Promise<void> {
  const userId = await requireUser()
  await dbAdapter.qboConnections.delete(userId)
}

/**
 * Stripe Connect Express — estado del connected account del contractor.
 * 3 estados: disconnected (no accountId) · pending (account pero charges_enabled=false) · active.
 */
export async function getStripeConnectInfo(): Promise<{
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirementsCurrentlyDue: string[]
  requirementsPastDue: string[]
}> {
  const userId = await requireUser()
  const user = await dbAdapter.users.findById(userId)

  if (!user?.stripeAccountId) {
    return { accountId: null, chargesEnabled: false, payoutsEnabled: false, requirementsCurrentlyDue: [], requirementsPastDue: [] }
  }

  // Fast path: usar cached flags del DB. Para requirements, sólo query a Stripe si onboarding pendiente.
  if (user.stripeAccountChargesEnabled && user.stripeAccountPayoutsEnabled) {
    return {
      accountId: user.stripeAccountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
    }
  }

  // Onboarding incompleto: traer requirements para mostrar al user qué falta.
  try {
    const account = await getStripe().accounts.retrieve(user.stripeAccountId)
    return {
      accountId: user.stripeAccountId,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
      requirementsPastDue: account.requirements?.past_due ?? [],
    }
  } catch {
    return { accountId: user.stripeAccountId, chargesEnabled: false, payoutsEnabled: false, requirementsCurrentlyDue: [], requirementsPastDue: [] }
  }
}

export async function getQboConnectionInfo(): Promise<{
  connected: boolean
  realmId?: string
  lastActivity?: Date
}> {
  const userId = await requireUser()
  const conn = await dbAdapter.qboConnections.findByUser(userId)
  if (!conn) return { connected: false }
  return {
    connected: true,
    realmId: conn.realmId,
    lastActivity: conn.updatedAt,
  }
}
