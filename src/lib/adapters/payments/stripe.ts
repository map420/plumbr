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
}
