'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { createCheckoutSession, createPortalSession } from '@/lib/actions/billing-actions'
import { updateProfile } from '@/lib/actions/profile'
import { getCatalogItems, createCatalogItem, deleteCatalogItem } from '@/lib/actions/catalog'
import { Toast } from '@/components/Toast'
import { ConfirmModal } from '@/components/ConfirmModal'
import {
  CheckCircle2, CreditCard, Zap, User, Building2, FileText,
  Receipt, Shield, Globe, Settings2, BookOpen, Plus, Trash2, UserCircle, ChevronRight, ChevronLeft, Bot,
} from 'lucide-react'
import { UserProfile } from '@clerk/nextjs'

type Profile = {
  name: string; companyName: string; phone: string; logoUrl: string;
  taxRate: string; documentFooter: string; paymentTerms: string
}

const TABS = [
  { id: 'account', label: 'My Account', icon: UserCircle },
  { id: 'company', label: 'My Company', icon: Building2 },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'taxes', label: 'Taxes', icon: Receipt },
  { id: 'docSettings', label: 'Doc Settings', icon: FileText },
  { id: 'license', label: 'License & Web Links', icon: Shield },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
  { id: 'catalog', label: 'Item Catalog', icon: BookOpen },
  { id: 'subscription', label: 'Subscription', icon: Zap },
] as const

// Mobile grouped layout — Joist pattern
const MOBILE_GROUPS = [
  { items: ['account'] },
  { items: ['company', 'license', 'docSettings', 'catalog', 'taxes'] },
  { items: ['payments', 'preferences', 'profile'] },
  { items: ['subscription'] },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsClient({ locale, plan, hasSubscription, profile: initialProfile }: {
  locale: string; plan: string; hasSubscription: boolean; profile: Profile
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSavingProfile, setSavingProfile] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [mobileSection, setMobileSection] = useState<TabId | null>(null)
  const { theme, setTheme } = useTheme()
  const isProPlan = plan === 'pro'

  // Catalog state
  const [catalogItemsList, setCatalogItemsList] = useState<any[]>([])
  const [showAddCatalog, setShowAddCatalog] = useState(false)
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', type: 'labor', unitPrice: '', description: '', category: '' })
  const [deleteCatalogId, setDeleteCatalogId] = useState<string | null>(null)

  useEffect(() => {
    getCatalogItems().then(setCatalogItemsList).catch(() => {})
  }, [])

  function handleAddCatalogItem(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const item = await createCatalogItem(newCatalogItem)
      setCatalogItemsList(prev => [...prev, item])
      setNewCatalogItem({ name: '', type: 'labor', unitPrice: '', description: '', category: '' })
      setShowAddCatalog(false)
    })
  }

  function handleDeleteCatalogItem() {
    if (!deleteCatalogId) return
    startTransition(async () => {
      await deleteCatalogItem(deleteCatalogId)
      setCatalogItemsList(prev => prev.filter(i => i.id !== deleteCatalogId))
    })
    setDeleteCatalogId(null)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    startTransition(async () => {
      await updateProfile(profile)
      setSaved(true)
      setSavingProfile(false)
      router.refresh()
    })
  }

  const SaveButton = () => (
    <button type="submit" disabled={isSavingProfile} className="btn-primary text-sm disabled:opacity-50">
      {isSavingProfile ? 'Saving...' : 'Save'}
    </button>
  )

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
      {saved && <Toast message="Settings saved!" onDone={() => setSaved(false)} />}
      {deleteCatalogId && (
        <ConfirmModal
          title="Delete Catalog Item"
          message="Are you sure you want to delete this catalog item? This action cannot be undone."
          onConfirm={handleDeleteCatalogItem}
          onCancel={() => setDeleteCatalogId(null)}
        />
      )}

      {/* Desktop sidebar tabs */}
      <nav className="hidden md:flex flex-col w-52 shrink-0 space-y-0.5">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
              style={{ background: isActive ? 'var(--wp-primary)' : 'transparent', color: isActive ? 'white' : 'var(--wp-text-secondary)' }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
        {/* External tab — lives on its own route */}
        <Link
          href={`/${locale}/settings/ai-preferences`}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
          style={{ color: 'var(--wp-text-secondary)' }}
        >
          <Bot size={16} />
          AI Preferences
        </Link>
      </nav>

      {/* Mobile: grouped list (Joist pattern) — shows when no section selected */}
      {!mobileSection && (
        <div className="md:hidden space-y-4 pb-20">
          {MOBILE_GROUPS.map((group, gi) => (
            <div key={gi} className="card overflow-hidden">
              {group.items.map((tabId, idx) => {
                const tab = TABS.find(t => t.id === tabId)!
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setMobileSection(tab.id) }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                    style={idx < group.items.length - 1 ? { borderBottom: '1px solid var(--wp-border-light)' } : undefined}
                  >
                    <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>{tab.label}</span>
                    <ChevronRight size={16} style={{ color: 'var(--wp-border)' }} />
                  </button>
                )
              })}
            </div>
          ))}
          {/* External: AI Preferences lives on its own route */}
          <Link
            href={`/${locale}/settings/ai-preferences`}
            className="card overflow-hidden flex items-center justify-between px-4 py-3.5 transition-colors"
          >
            <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>AI Preferences</span>
            <ChevronRight size={16} style={{ color: 'var(--wp-border)' }} />
          </Link>
        </div>
      )}

      {/* Mobile: section content with back header */}
      {mobileSection && (
        <div className="md:hidden">
          <button
            onClick={() => setMobileSection(null)}
            className="flex items-center gap-1 mb-4 text-sm font-medium"
            style={{ color: 'var(--wp-accent)' }}
          >
            <ChevronLeft size={16} /> Settings
          </button>
        </div>
      )}

      {/* Content — desktop always visible, mobile only when section selected */}
      <div className={`flex-1 min-w-0 ${mobileSection ? '' : 'hidden md:block'}`}>
        {/* My Company */}
        {/* My Account — Clerk UserProfile */}
        {activeTab === 'account' && (
          <div className="card p-0 overflow-hidden">
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'shadow-none border-0 w-full',
                  navbar: 'hidden',
                  pageScrollBox: 'p-0',
                  page: 'p-4',
                },
              }}
            />
          </div>
        )}

        {/* My Company */}
        {activeTab === 'company' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">My Company</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Company Name</label>
                <input
                  value={profile.companyName}
                  onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))}
                  className="input text-sm"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="input text-sm"
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Company Logo</label>
                <input
                  type="url"
                  value={profile.logoUrl}
                  onChange={e => setProfile(p => ({ ...p, logoUrl: e.target.value }))}
                  className="input text-sm"
                  placeholder="https://yourcompany.com/logo.png"
                />
                <p className="text-xs mt-1">Shown on estimates and invoices sent to clients.</p>
                {profile.logoUrl && (
                  <div className="mt-2 p-2 rounded-lg inline-block" style={{ background: 'var(--wp-bg-muted)' }}>
                    <img src={profile.logoUrl} alt="Logo" className="h-12 object-contain" />
                  </div>
                )}
              </div>
              <SaveButton />
            </form>
          </div>
        )}

        {/* Profile */}
        {activeTab === 'profile' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Profile</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="input text-sm"
                  placeholder="Your full name"
                />
              </div>
              <SaveButton />
            </form>
          </div>
        )}

        {/* Taxes */}
        {activeTab === 'taxes' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Taxes</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Default Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={profile.taxRate}
                  onChange={e => setProfile(p => ({ ...p, taxRate: e.target.value }))}
                  className="input text-sm max-w-[120px]"
                  placeholder="8.25"
                />
                <p className="text-xs mt-1">Applied automatically to new estimates and invoices.</p>
              </div>
              <SaveButton />
            </form>
          </div>
        )}

        {/* Doc Settings */}
        {activeTab === 'docSettings' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Document Settings</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Default Payment Terms</label>
                <select
                  value={profile.paymentTerms}
                  onChange={e => setProfile(p => ({ ...p, paymentTerms: e.target.value }))}
                  className="input text-sm max-w-[220px]"
                >
                  <option value="due_on_receipt">Due on receipt</option>
                  <option value="net15">Net 15 (due in 15 days)</option>
                  <option value="net30">Net 30 (due in 30 days)</option>
                  <option value="net45">Net 45 (due in 45 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Footer / Terms</label>
                <textarea
                  rows={3}
                  value={profile.documentFooter}
                  onChange={e => setProfile(p => ({ ...p, documentFooter: e.target.value }))}
                  className="input text-sm resize-none"
                  placeholder="e.g. Payment due within 30 days. Thank you for your business."
                />
                <p className="text-xs mt-1">Appears at the bottom of all estimates and invoices.</p>
              </div>
              <SaveButton />
            </form>
          </div>
        )}

        {/* License & Web Links */}
        {activeTab === 'license' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">License & Web Links</h2>
            <p className="text-sm mb-4">Display your credentials on estimates and invoices.</p>
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">Coming soon — license number, insurance info, and web/social links will be configurable here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === 'payments' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Payments</h2>
            <p className="text-sm mb-4">Configure how you accept payments from clients.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="text-sm font-medium">Accept Online Payments</div>
                  <div className="text-xs">Let clients pay via credit card on invoices</div>
                </div>
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">Active via Stripe</div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="text-sm font-medium">Accept ACH Bank Transfers</div>
                  <div className="text-xs">1% fee capped at $15 per transaction</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span className="text-xs text-amber-700">Coming soon</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <div className="text-sm font-medium">Cover Processing Fee</div>
                  <div className="text-xs">Pass the payment processing fee to your client</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  <span className="text-xs text-amber-700">Coming soon</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">Automatic Reminders</div>
                  <div className="text-xs">Clients receive email reminders 3 days before invoice due date. Overdue invoices are auto-marked and clients are notified.</div>
                </div>
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded">Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        {activeTab === 'preferences' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Preferences</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Language</label>
                <div className="flex gap-2">
                  <Link
                    href={`/en/settings`}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    style={{ background: locale === 'en' ? 'var(--wp-primary)' : 'transparent', color: locale === 'en' ? 'white' : 'var(--wp-text-secondary)', borderColor: locale === 'en' ? 'var(--wp-primary)' : 'var(--wp-border)' }}
                  >
                    English
                  </Link>
                  <Link
                    href={`/es/settings`}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                    style={{ background: locale === 'es' ? 'var(--wp-primary)' : 'transparent', color: locale === 'es' ? 'white' : 'var(--wp-text-secondary)', borderColor: locale === 'es' ? 'var(--wp-primary)' : 'var(--wp-border)' }}
                  >
                    Español
                  </Link>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Theme</label>
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map(t => (
                    <button key={t} onClick={() => setTheme(t)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize"
                      style={{ background: theme === t ? 'var(--wp-primary)' : 'transparent', color: theme === t ? 'white' : 'var(--wp-text-secondary)', borderColor: theme === t ? 'var(--wp-primary)' : 'var(--wp-border)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Item Catalog */}
        {activeTab === 'catalog' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Item Catalog</h2>
              <button onClick={() => setShowAddCatalog(true)} className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--wp-accent)' }}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            {/* Add item form */}
            {showAddCatalog && (
              <form onSubmit={handleAddCatalogItem} className="space-y-3 mb-4 p-4 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }}>
                <div className="grid grid-cols-2 gap-3">
                  <input value={newCatalogItem.name} onChange={e => setNewCatalogItem(p => ({...p, name: e.target.value}))} placeholder="Item name" className="input text-sm" required />
                  <select value={newCatalogItem.type} onChange={e => setNewCatalogItem(p => ({...p, type: e.target.value}))} className="input text-sm">
                    <option value="labor">Labor</option>
                    <option value="material">Material</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={newCatalogItem.unitPrice} onChange={e => setNewCatalogItem(p => ({...p, unitPrice: e.target.value}))} placeholder="Unit price" className="input text-sm" />
                  <input value={newCatalogItem.category} onChange={e => setNewCatalogItem(p => ({...p, category: e.target.value}))} placeholder="Category (optional)" className="input text-sm" />
                </div>
                <textarea value={newCatalogItem.description} onChange={e => setNewCatalogItem(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" className="input text-sm resize-none" rows={2} />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-sm">Save</button>
                  <button type="button" onClick={() => setShowAddCatalog(false)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </form>
            )}

            {/* Items list */}
            {catalogItemsList.length === 0 ? (
              <p className="text-sm">No catalog items yet. Add your first item above.</p>
            ) : (
              <div className="space-y-2">
                {catalogItemsList.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ border: '1px solid var(--wp-border-light)' }}>
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs ml-2">{item.type} · ${parseFloat(item.unitPrice).toFixed(2)}</span>
                      {item.category && <span className="text-xs ml-2">({item.category})</span>}
                    </div>
                    <button onClick={() => setDeleteCatalogId(item.id)} className="hover:text-red-500" style={{ color: 'var(--wp-text-muted)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscription */}
        {activeTab === 'subscription' && (
          <div className="card p-6">
            <h2 className="font-semibold mb-4">Subscription</h2>

            <div className={`flex items-center gap-2 mb-4 text-sm font-medium ${isProPlan ? 'text-green-600' : ''}`} style={!isProPlan ? { color: 'var(--wp-text-muted)' } : undefined}>
              {isProPlan ? <CheckCircle2 size={16} /> : <Zap size={16} />}
              {isProPlan ? 'Pro plan — active' : 'Starter (free)'}
            </div>

            {isProPlan ? (
              hasSubscription ? (
                <button
                  onClick={() => startTransition(() => createPortalSession(locale))}
                  disabled={isPending}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {isPending ? '...' : 'Manage subscription'}
                </button>
              ) : (
                <p className="text-sm">Your Pro plan is active.</p>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-sm">Upgrade to Pro for $29/month — includes a 14-day free trial.</p>
                <div className="rounded-xl p-4" style={{ background: 'var(--wp-bg-muted)', border: '1px solid var(--wp-border-light)' }}>
                  <div className="text-xs font-bold mb-2" style={{ color: 'var(--wp-primary)' }}>PRO INCLUDES:</div>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--wp-text-muted)' }}>
                    <li>Unlimited jobs, estimates & invoices</li>
                    <li>Team management & crew scheduling</li>
                    <li>Digital signatures & contracts</li>
                    <li>Photo documentation</li>
                    <li>AI Assistant</li>
                    <li>SMS & QuickBooks sync</li>
                  </ul>
                </div>
                <button
                  onClick={() => startTransition(() => createCheckoutSession(locale))}
                  disabled={isPending}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {isPending ? 'Redirecting...' : 'Upgrade to Pro — $29/mo'}
                </button>
                <div>
                  <Link href={`/${locale}/pricing`} className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>
                    See full feature comparison →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
