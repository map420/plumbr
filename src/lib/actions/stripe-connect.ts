'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireUser as requireAuth } from './auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { paymentsAdapter } from '@/lib/adapters/payments'
import { isPro } from '@/lib/stripe'

function getOrigin(headersList: Awaited<ReturnType<typeof headers>>) {
  return headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
}

/**
 * Start Stripe Connect onboarding: crea Account (si no existe) y devuelve URL
 * al formulario Express hosted by Stripe. Pro-gated.
 */
export async function startStripeConnectOnboarding(locale: string) {
  const userId = await requireAuth()
  const user = await dbAdapter.users.findById(userId)
  if (!user) redirect(`/${locale}/sign-in`)

  if (!isPro(user.plan ?? 'starter')) {
    throw new Error('PLAN_LIMIT: Stripe Connect requires Pro plan.')
  }

  let accountId = user.stripeAccountId ?? null
  if (!accountId) {
    const { accountId: newId } = await paymentsAdapter.createConnectAccount({
      email: user.email,
      country: 'US',
      metadata: { userId: user.id },
    })
    accountId = newId
    await dbAdapter.users.update(user.id, { stripeAccountId: accountId } )
  }

  const headersList = await headers()
  const origin = getOrigin(headersList)

  const { url } = await paymentsAdapter.createConnectAccountLink({
    accountId,
    refreshUrl: `${origin}/${locale}/settings?tab=integrations&stripe=refresh`,
    returnUrl: `${origin}/${locale}/settings?tab=integrations&stripe=return`,
  })

  redirect(url)
}

/**
 * Abrir Stripe Express dashboard del contractor (ver pagos, payouts, etc).
 * Solo funciona si ya completó onboarding (detailsSubmitted).
 */
export async function openStripeExpressDashboard(locale: string) {
  const userId = await requireAuth()
  const user = await dbAdapter.users.findById(userId)
  if (!user?.stripeAccountId) redirect(`/${locale}/settings?tab=integrations`)

  const { url } = await paymentsAdapter.createConnectLoginLink(user.stripeAccountId)
  redirect(url)
}

/**
 * Sync estado del account desde Stripe (llamar tras onboarding return).
 * Devuelve el snapshot para que la UI lo muestre inmediatamente.
 */
export async function syncStripeConnectStatus() {
  const userId = await requireAuth()
  const user = await dbAdapter.users.findById(userId)
  if (!user?.stripeAccountId) return null

  const account = await paymentsAdapter.getConnectAccount(user.stripeAccountId)
  await dbAdapter.users.update(user.id, {
    stripeAccountChargesEnabled: account.chargesEnabled,
    stripeAccountPayoutsEnabled: account.payoutsEnabled,
  } )

  revalidatePath('/[locale]/settings', 'page')
  return {
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    detailsSubmitted: account.detailsSubmitted,
    requirementsCurrentlyDue: account.requirementsCurrentlyDue,
    requirementsPastDue: account.requirementsPastDue,
  }
}

/**
 * Desconectar Stripe Connect (soft: solo quitar del user row; el account queda en Stripe).
 * Si quieres hard delete, usar Stripe API `accounts.del()` pero generalmente mejor soft.
 */
export async function disconnectStripeAccount() {
  const userId = await requireAuth()
  await dbAdapter.users.update(userId, {
    stripeAccountId: null,
    stripeAccountChargesEnabled: false,
    stripeAccountPayoutsEnabled: false,
  } )
  revalidatePath('/[locale]/settings', 'page')
}
