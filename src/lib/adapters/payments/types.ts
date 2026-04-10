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
}
