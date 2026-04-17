'use server'
import { requireUser as requireAuth } from './auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'

export async function sendEstimateSms(estimateId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth()
    const estimate = await dbAdapter.estimates.findById(estimateId, userId)
    if (!estimate) return { success: false, error: 'Estimate not found' }

    // Check Twilio config
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return { success: false, error: 'SMS is not configured. Set up Twilio in your environment variables.' }
    }

    const { createTwilioAdapter } = await import('@/lib/adapters/sms')
    const smsAdapter = createTwilioAdapter()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://workpilot.mrlabs.io'
    const portalUrl = `${appUrl}/en/portal/${estimate.shareToken}`
    const body = `You have a new estimate (${estimate.number}) for $${parseFloat(estimate.total).toFixed(2)}. View and approve: ${portalUrl}`

    await smsAdapter.sendSms(phoneNumber, body)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'SMS failed' }
  }
}

export async function sendInvoiceSms(invoiceId: string, phoneNumber?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth()
    const invoice = await dbAdapter.invoices.findById(invoiceId, userId)
    if (!invoice) return { success: false, error: 'Invoice not found' }

    // Get phone from parameter or lookup from clients
    let phone = phoneNumber
    if (!phone) {
      const clients = await dbAdapter.clients.findAll(userId)
      const client = clients.find(c => c.name === invoice.clientName || c.email === invoice.clientEmail)
      phone = client?.phone || undefined
    }
    if (!phone) return { success: false, error: 'No phone number found for this client' }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return { success: false, error: 'SMS is not configured. Set up Twilio in your environment variables.' }
    }

    const { createTwilioAdapter } = await import('@/lib/adapters/sms')
    const smsAdapter = createTwilioAdapter()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://workpilot.mrlabs.io'
    const portalUrl = `${appUrl}/en/portal/${invoice.shareToken}`
    const body = `You have an invoice (${invoice.number}) for $${parseFloat(invoice.total).toFixed(2)}. Pay online: ${portalUrl}`

    await smsAdapter.sendSms(phone, body)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'SMS failed' }
  }
}
