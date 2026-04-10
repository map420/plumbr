import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

export const PLANS = {
  pro: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Unlimited jobs & estimates',
      'Invoice generation & tracking',
      'Field mobile view',
      'Schedule calendar',
      'English & Spanish',
      'Email support',
    ],
  },
} as const
