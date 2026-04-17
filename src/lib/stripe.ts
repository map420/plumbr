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
    price: 29,
    annualPrice: 249,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
    features: [
      'Unlimited jobs & estimates',
      'Invoice generation & tracking',
      'Team / Technicians management',
      'Field mobile view',
      'Schedule calendar',
      'Email automations',
      'Digital signatures & contracts',
      'Photo documentation',
      'Change orders & work orders',
      'AI Assistant',
      'SMS delivery',
      'QuickBooks sync',
      'English & Spanish',
      'Priority support',
    ],
  },
} as const

export const STARTER_LIMITS = {
  jobs: 5,
  estimates: 5,
  clients: 10,
  catalogItems: 10,
  photos: 5,
  team: false,
} as const

export function isPro(plan: string | null | undefined): boolean {
  return plan === 'pro' || plan === 'Pro'
}
