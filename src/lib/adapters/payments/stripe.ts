import Stripe from 'stripe'
import type { PaymentsAdapter } from './types'

let _stripe: Stripe | null = null
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
  return _stripe
}

export const stripeAdapter: PaymentsAdapter = {
  async createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, trialDays, metadata }) {
    const session = await getStripe().checkout.sessions.create({
      ...(customerId && { customer: customerId }),
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays && { subscription_data: { trial_period_days: trialDays } }),
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(metadata && { metadata }),
    })
    return { url: session.url!, sessionId: session.id }
  },

  async createPortalSession({ customerId, returnUrl }) {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return { url: session.url }
  },

  async createCustomer({ email, name, metadata }) {
    const customer = await getStripe().customers.create({
      email,
      ...(name && { name }),
      ...(metadata && { metadata }),
    })
    return { id: customer.id }
  },

  async createPaymentLink({ amountCents, currency, description, metadata, stripeAccount }) {
    const stripe = getStripe()
    // Direct Charge: el price + paymentLink se crean EN LA CUENTA DEL CONTRACTOR.
    // Pago aterriza directo en su balance, NO en el platform account.
    const requestOpts = stripeAccount ? { stripeAccount } : undefined

    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency,
      product_data: { name: description },
    }, requestOpts)

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      ...(metadata && { metadata }),
      // Propagate metadata to each generated PaymentIntent so the webhook
      // can look up invoiceId from payment_intent.metadata.
      ...(metadata && { payment_intent_data: { metadata } }),
    }, requestOpts)

    return { url: link.url, id: link.id }
  },

  // ── Stripe Connect Express ──
  async createConnectAccount({ email, country = 'US', metadata }) {
    const account = await getStripe().accounts.create({
      type: 'express',
      country,
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      ...(metadata && { metadata }),
    })
    return { accountId: account.id }
  },

  async createConnectAccountLink({ accountId, refreshUrl, returnUrl }) {
    const link = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })
    return { url: link.url }
  },

  async getConnectAccount(accountId) {
    const account = await getStripe().accounts.retrieve(accountId)
    return {
      id: account.id,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
      requirementsPastDue: account.requirements?.past_due ?? [],
    }
  },

  async createConnectLoginLink(accountId) {
    const link = await getStripe().accounts.createLoginLink(accountId)
    return { url: link.url }
  },
}
