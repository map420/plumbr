import { getUserPlan } from '@/lib/actions/billing'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { getStripeConnectionInfo, getStripeBillingInfo, getQboConnectionInfo, getStripeConnectInfo } from '@/lib/actions/integrations'
import { getAiPreferences } from '@/lib/actions/ai-preferences'
import { SettingsClient } from './_components/SettingsClient'
import type { AiPref } from './_components/sections/AiPreferencesSection'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [userPlan, userId] = await Promise.all([getUserPlan(), requireUser()])
  const [user, stripeInfo, billingInfo, qboInfo, aiPrefs, stripeConnect] = await Promise.all([
    dbAdapter.users.findById(userId),
    getStripeConnectionInfo(),
    getStripeBillingInfo(),
    getQboConnectionInfo(),
    getAiPreferences(),
    getStripeConnectInfo(),
  ])

  const u = user as typeof user & {
    businessCity?: string | null
    businessPostalCode?: string | null
    defaultCurrency?: string | null
    websiteUrl?: string | null
    insuranceInfo?: string | null
    socialLinks?: Record<string, string> | null
    showCredentialsOnDocs?: boolean | null
    acceptAch?: boolean | null
    coverProcessingFee?: boolean | null
    smsEnabled?: boolean | null
    smsPhoneNumber?: string | null
    emailDigestEnabled?: boolean | null
    smsRemindersEnabled?: boolean | null
    weeklyDigestEnabled?: boolean | null
    notifyJobAssigned?: boolean | null
    notifyEstimateApproved?: boolean | null
    notifyInvoicePaid?: boolean | null
    notifyInvoiceOverdue?: boolean | null
    notifyPaymentReceived?: boolean | null
  } | null

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--wp-text)' }}>
        {locale === 'es' ? 'Configuración' : 'Settings'}
      </h1>
      <SettingsClient
        locale={locale}
        plan={userPlan?.plan ?? 'starter'}
        hasSubscription={!!userPlan?.stripeSubscriptionId}
        qboConnected={qboInfo.connected}
        stripeInfo={stripeInfo}
        stripeConnect={stripeConnect}
        billingInfo={billingInfo}
        qboInfo={qboInfo}
        aiPrefs={aiPrefs as AiPref[]}
        profile={{
          name: u?.name ?? '',
          email: u?.email ?? '',
          companyName: u?.companyName ?? '',
          phone: u?.phone ?? '',
          logoUrl: u?.logoUrl ?? '',
          taxRate: u?.taxRate ?? '',
          documentFooter: u?.documentFooter ?? '',
          paymentTerms: u?.paymentTerms ?? 'net30',
          businessTaxId: u?.businessTaxId ?? '',
          licenseNumber: u?.licenseNumber ?? '',
          licenseState: u?.licenseState ?? '',
          businessAddress: u?.businessAddress ?? '',
          businessCity: u?.businessCity ?? '',
          businessPostalCode: u?.businessPostalCode ?? '',
          defaultCurrency: u?.defaultCurrency ?? 'USD',
          websiteUrl: u?.websiteUrl ?? '',
          insuranceInfo: u?.insuranceInfo ?? '',
          socialLinks: (u?.socialLinks as Record<string, string> | null) ?? {},
          showCredentialsOnDocs: !!u?.showCredentialsOnDocs,
          acceptAch: !!u?.acceptAch,
          coverProcessingFee: !!u?.coverProcessingFee,
          smsEnabled: !!u?.smsEnabled,
          smsPhoneNumber: u?.smsPhoneNumber ?? '',
          emailDigestEnabled: u?.emailDigestEnabled ?? true,
          smsRemindersEnabled: u?.smsRemindersEnabled ?? false,
          weeklyDigestEnabled: u?.weeklyDigestEnabled ?? true,
          notifyJobAssigned: u?.notifyJobAssigned ?? true,
          notifyEstimateApproved: u?.notifyEstimateApproved ?? true,
          notifyInvoicePaid: u?.notifyInvoicePaid ?? true,
          notifyInvoiceOverdue: u?.notifyInvoiceOverdue ?? true,
          notifyPaymentReceived: u?.notifyPaymentReceived ?? true,
        }}
      />
    </div>
  )
}
