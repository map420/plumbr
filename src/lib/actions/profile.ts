'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser } from './auth-helpers'

export async function updateProfile(data: {
  name: string; companyName: string; phone: string
  logoUrl?: string; taxRate?: string; documentFooter?: string; paymentTerms?: string
  email?: string
  businessTaxId?: string
  licenseNumber?: string; licenseState?: string
  businessAddress?: string; businessCity?: string; businessPostalCode?: string
  defaultCurrency?: string
  websiteUrl?: string; insuranceInfo?: string
  socialLinks?: Record<string, string>
  showCredentialsOnDocs?: boolean
  acceptAch?: boolean; coverProcessingFee?: boolean
  smsEnabled?: boolean; smsPhoneNumber?: string
  emailDigestEnabled?: boolean; smsRemindersEnabled?: boolean; weeklyDigestEnabled?: boolean
  notifyJobAssigned?: boolean; notifyEstimateApproved?: boolean; notifyInvoicePaid?: boolean
  notifyInvoiceOverdue?: boolean; notifyPaymentReceived?: boolean
}) {
  const userId = await requireUser()
  const patch: Record<string, unknown> = {
    name: data.name || null,
    companyName: data.companyName || null,
    phone: data.phone || null,
    logoUrl: data.logoUrl || null,
    taxRate: data.taxRate || null,
    documentFooter: data.documentFooter || null,
    paymentTerms: data.paymentTerms || 'net30',
  }
  if (data.email !== undefined) patch.email = data.email
  if (data.businessTaxId !== undefined) patch.businessTaxId = data.businessTaxId || null
  if (data.licenseNumber !== undefined) patch.licenseNumber = data.licenseNumber || null
  if (data.licenseState !== undefined) patch.licenseState = data.licenseState || null
  if (data.businessAddress !== undefined) patch.businessAddress = data.businessAddress || null
  if (data.businessCity !== undefined) patch.businessCity = data.businessCity || null
  if (data.businessPostalCode !== undefined) patch.businessPostalCode = data.businessPostalCode || null
  if (data.defaultCurrency !== undefined) patch.defaultCurrency = data.defaultCurrency || 'USD'
  if (data.websiteUrl !== undefined) patch.websiteUrl = data.websiteUrl || null
  if (data.insuranceInfo !== undefined) patch.insuranceInfo = data.insuranceInfo || null
  if (data.socialLinks !== undefined) patch.socialLinks = data.socialLinks
  if (data.showCredentialsOnDocs !== undefined) patch.showCredentialsOnDocs = data.showCredentialsOnDocs
  if (data.acceptAch !== undefined) patch.acceptAch = data.acceptAch
  if (data.coverProcessingFee !== undefined) patch.coverProcessingFee = data.coverProcessingFee
  if (data.smsEnabled !== undefined) patch.smsEnabled = data.smsEnabled
  if (data.smsPhoneNumber !== undefined) patch.smsPhoneNumber = data.smsPhoneNumber || null
  if (data.emailDigestEnabled !== undefined) patch.emailDigestEnabled = data.emailDigestEnabled
  if (data.smsRemindersEnabled !== undefined) patch.smsRemindersEnabled = data.smsRemindersEnabled
  if (data.weeklyDigestEnabled !== undefined) patch.weeklyDigestEnabled = data.weeklyDigestEnabled
  if (data.notifyJobAssigned !== undefined) patch.notifyJobAssigned = data.notifyJobAssigned
  if (data.notifyEstimateApproved !== undefined) patch.notifyEstimateApproved = data.notifyEstimateApproved
  if (data.notifyInvoicePaid !== undefined) patch.notifyInvoicePaid = data.notifyInvoicePaid
  if (data.notifyInvoiceOverdue !== undefined) patch.notifyInvoiceOverdue = data.notifyInvoiceOverdue
  if (data.notifyPaymentReceived !== undefined) patch.notifyPaymentReceived = data.notifyPaymentReceived
  await dbAdapter.users.update(userId, patch)
}

/** Returns the current user's profile row, or null if missing. */
export async function getCurrentUserProfile() {
  const userId = await requireUser()
  return dbAdapter.users.findById(userId)
}
