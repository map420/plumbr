import type { PaymentsAdapter } from './types'

export const mockAdapter: PaymentsAdapter = {
  async createCheckoutSession({ successUrl }) {
    console.log('[PAYMENTS MOCK] checkout — redirecting to success')
    return { url: `${successUrl}?mock=1`, sessionId: `mock_cs_${Date.now()}` }
  },
  async createPortalSession({ returnUrl }) {
    console.log('[PAYMENTS MOCK] portal session')
    return { url: returnUrl }
  },
  async createCustomer({ email }) {
    console.log('[PAYMENTS MOCK] customer created for', email)
    return { id: `mock_cus_${email.split('@')[0]}` }
  },
  async createPaymentLink({ amountCents, description }) {
    console.log('[PAYMENTS MOCK] payment link —', description, amountCents)
    return { url: 'https://buy.stripe.com/mock', id: `mock_pl_${Date.now()}` }
  },
}
