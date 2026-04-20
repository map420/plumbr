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
  async createPaymentLink({ amountCents, description, stripeAccount }) {
    console.log('[PAYMENTS MOCK] payment link —', description, amountCents, stripeAccount ? `(→ ${stripeAccount})` : '(platform)')
    return { url: 'https://buy.stripe.com/mock', id: `mock_pl_${Date.now()}` }
  },
  async createConnectAccount({ email }) {
    console.log('[PAYMENTS MOCK] connect account for', email)
    return { accountId: `mock_acct_${email.split('@')[0]}` }
  },
  async createConnectAccountLink({ accountId, returnUrl }) {
    console.log('[PAYMENTS MOCK] account link for', accountId)
    return { url: `${returnUrl}?mock=connect` }
  },
  async getConnectAccount(accountId) {
    console.log('[PAYMENTS MOCK] retrieve account', accountId)
    return {
      id: accountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      requirementsCurrentlyDue: [],
      requirementsPastDue: [],
    }
  },
  async createConnectLoginLink(accountId) {
    console.log('[PAYMENTS MOCK] login link for', accountId)
    return { url: `https://dashboard.stripe.com/mock/${accountId}` }
  },
}
