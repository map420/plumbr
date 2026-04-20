export interface PaymentsAdapter {
  createCheckoutSession(opts: {
    customerId?: string
    priceId: string
    successUrl: string
    cancelUrl: string
    trialDays?: number
    metadata?: Record<string, string>
  }): Promise<{ url: string; sessionId: string }>

  createPortalSession(opts: {
    customerId: string
    returnUrl: string
  }): Promise<{ url: string }>

  createCustomer(opts: {
    email: string
    name?: string
    metadata?: Record<string, string>
  }): Promise<{ id: string }>

  createPaymentLink(opts: {
    amountCents: number
    currency: string
    description: string
    metadata?: Record<string, string>
    // Stripe Connect Direct Charge: si se pasa, el pago va al contractor's connected account.
    stripeAccount?: string
  }): Promise<{ url: string; id: string }>

  // Stripe Connect Express — onboarding flow para contractor.
  createConnectAccount(opts: {
    email: string
    country?: string
    metadata?: Record<string, string>
  }): Promise<{ accountId: string }>

  createConnectAccountLink(opts: {
    accountId: string
    refreshUrl: string
    returnUrl: string
  }): Promise<{ url: string }>

  getConnectAccount(accountId: string): Promise<{
    id: string
    chargesEnabled: boolean
    payoutsEnabled: boolean
    detailsSubmitted: boolean
    requirementsCurrentlyDue: string[]
    requirementsPastDue: string[]
  }>

  createConnectLoginLink(accountId: string): Promise<{ url: string }>
}
