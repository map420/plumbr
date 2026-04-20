'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SettingsSidebar, type SettingsTabId } from './SettingsSidebar'
import { AccountSection } from './sections/AccountSection'
import { CompanySection, type CompanyFormState } from './sections/CompanySection'
import { BillingSection } from './sections/BillingSection'
import { NotificationsSection, type NotificationsFormState } from './sections/NotificationsSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { IntegrationsSection, type IntegrationsFormState } from './sections/IntegrationsSection'
import { TemplatesSection, type TemplatesFormState } from './sections/TemplatesSection'
import { CatalogSection } from './sections/CatalogSection'
import { AiPreferencesSection, type AiPref } from './sections/AiPreferencesSection'

type Profile = CompanyFormState & NotificationsFormState & IntegrationsFormState & TemplatesFormState & {
  name: string
}

type StripeInfo = {
  connected: boolean
  paymentMethodLast4?: string
  paymentMethodBrand?: string
}

type StripeConnectInfo = {
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  requirementsCurrentlyDue: string[]
  requirementsPastDue: string[]
}

type BillingInfo = {
  plan: 'starter' | 'pro'
  nextBillingDate: Date | null
  interval: 'month' | 'year' | null
  amount: number | null
  cancelAtPeriodEnd: boolean
}

type QboInfo = {
  connected: boolean
  realmId?: string
  lastActivity?: Date
}

const DEFAULT_TAB: SettingsTabId = 'company'
const VALID_TABS: SettingsTabId[] = ['account', 'company', 'billing', 'notifications', 'appearance', 'ai', 'integrations', 'templates', 'catalog']

export function SettingsClient({
  locale, hasSubscription, profile, stripeInfo, stripeConnect, billingInfo, qboInfo, aiPrefs,
}: {
  locale: string
  plan: string
  hasSubscription: boolean
  qboConnected: boolean
  profile: Profile
  stripeInfo: StripeInfo
  stripeConnect: StripeConnectInfo
  billingInfo: BillingInfo
  qboInfo: QboInfo
  aiPrefs: AiPref[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const urlTab = params.get('tab') as SettingsTabId | null
  const initialTab: SettingsTabId = urlTab && VALID_TABS.includes(urlTab) ? urlTab : DEFAULT_TAB
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab)
  const es = locale === 'es'

  const isProPlan = billingInfo.plan === 'pro'
  const baseProfile = { name: profile.name, companyName: profile.companyName, phone: profile.phone }
  const hasCredentials = !!(profile.licenseNumber || profile.insuranceInfo)
  const smsPhoneConfigured = !!profile.smsPhoneNumber

  const handleTabChange = useCallback((next: SettingsTabId) => {
    setActiveTab(next)
    const p = new URLSearchParams(Array.from(params.entries()))
    if (next === DEFAULT_TAB) p.delete('tab')
    else p.set('tab', next)
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [params, pathname, router])

  // Sync when URL changes externally (browser back/forward)
  useEffect(() => {
    const next = (params.get('tab') as SettingsTabId | null) ?? DEFAULT_TAB
    if (VALID_TABS.includes(next) && next !== activeTab) setActiveTab(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0">
        <SettingsSidebar activeKey={activeTab} onChange={handleTabChange} locale={locale} />
      </aside>

      {/* Mobile tab pills */}
      <div className="md:hidden overflow-x-auto -mx-4 px-4 pb-2">
        <div className="flex gap-1.5 w-max">
          {(['company', 'account', 'billing', 'notifications', 'appearance', 'ai', 'integrations', 'templates', 'catalog'] as SettingsTabId[]).map(k => (
            <button
              key={k}
              onClick={() => handleTabChange(k)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                background: activeTab === k ? 'var(--wp-text)' : 'var(--wp-surface-2)',
                color: activeTab === k ? 'white' : 'var(--wp-text-2)',
              }}
            >
              {MOBILE_LABELS[k][es ? 'es' : 'en']}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-4xl">
        {activeTab === 'account' && <AccountSection locale={locale} />}
        {activeTab === 'company' && <CompanySection initial={profile} locale={locale} />}
        {activeTab === 'billing' && (
          <BillingSection locale={locale} hasSubscription={hasSubscription} billingInfo={billingInfo} />
        )}
        {activeTab === 'notifications' && (
          <NotificationsSection
            initial={{
              emailDigestEnabled: profile.emailDigestEnabled,
              smsRemindersEnabled: profile.smsRemindersEnabled,
              weeklyDigestEnabled: profile.weeklyDigestEnabled,
              notifyJobAssigned: profile.notifyJobAssigned,
              notifyEstimateApproved: profile.notifyEstimateApproved,
              notifyInvoicePaid: profile.notifyInvoicePaid,
              notifyInvoiceOverdue: profile.notifyInvoiceOverdue,
              notifyPaymentReceived: profile.notifyPaymentReceived,
            }}
            locale={locale}
            baseProfile={baseProfile}
            smsPhoneConfigured={smsPhoneConfigured}
          />
        )}
        {activeTab === 'appearance' && <AppearanceSection locale={locale} />}
        {activeTab === 'ai' && <AiPreferencesSection initial={aiPrefs} locale={locale} />}
        {activeTab === 'integrations' && (
          <IntegrationsSection
            initial={{
              acceptAch: profile.acceptAch,
              coverProcessingFee: profile.coverProcessingFee,
              smsEnabled: profile.smsEnabled,
              smsPhoneNumber: profile.smsPhoneNumber,
            }}
            locale={locale}
            baseProfile={baseProfile}
            stripeInfo={stripeInfo}
            stripeConnect={stripeConnect}
            qboInfo={qboInfo}
            isProPlan={isProPlan}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesSection
            initial={{
              paymentTerms: profile.paymentTerms,
              documentFooter: profile.documentFooter,
              showCredentialsOnDocs: profile.showCredentialsOnDocs,
            }}
            locale={locale}
            baseProfile={baseProfile}
            hasCredentials={hasCredentials}
          />
        )}
        {activeTab === 'catalog' && <CatalogSection locale={locale} />}
      </div>
    </div>
  )
}

const MOBILE_LABELS: Record<SettingsTabId, { en: string; es: string }> = {
  account: { en: 'Account', es: 'Cuenta' },
  company: { en: 'Company', es: 'Empresa' },
  billing: { en: 'Billing', es: 'Plan' },
  notifications: { en: 'Notifs', es: 'Alertas' },
  appearance: { en: 'Appearance', es: 'Apariencia' },
  ai: { en: 'AI', es: 'AI' },
  integrations: { en: 'Integrations', es: 'Integraciones' },
  templates: { en: 'Templates', es: 'Plantillas' },
  catalog: { en: 'Catalog', es: 'Catálogo' },
}
