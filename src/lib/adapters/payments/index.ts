import { stripeAdapter } from './stripe'
import { mockAdapter } from './mock'

export const paymentsAdapter =
  process.env.STRIPE_SECRET_KEY ? stripeAdapter : mockAdapter
