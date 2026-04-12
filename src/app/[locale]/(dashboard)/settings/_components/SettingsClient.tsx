'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCheckoutSession, createPortalSession } from '@/lib/actions/billing'
import { updateProfile } from '@/lib/actions/profile'
import { Toast } from '@/components/Toast'
import { CheckCircle2, CreditCard, Zap, User } from 'lucide-react'

type Profile = { name: string; companyName: string; phone: string }

export function SettingsClient({ locale, plan, hasSubscription, profile: initialProfile }: {
  locale: string; plan: string; hasSubscription: boolean; profile: Profile
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSavingProfile, setSavingProfile] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const isPro = plan === 'pro'

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    startTransition(async () => {
      await updateProfile(profile)
      setSaved(true)
      setSavingProfile(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {saved && <Toast message="Profile saved!" onDone={() => setSaved(false)} />}

      {/* Profile */}
      <div className="plumbr-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-slate-600" />
          <h2 className="font-semibold text-slate-900">Profile</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              className="plumbr-input text-sm"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
            <input
              value={profile.companyName}
              onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))}
              className="plumbr-input text-sm"
              placeholder="Your company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
              className="plumbr-input text-sm"
              placeholder="(555) 000-0000"
            />
          </div>
          <button type="submit" disabled={isSavingProfile} className="btn-primary text-sm disabled:opacity-50">
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Subscription */}
      <div className="plumbr-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={20} className="text-slate-600" />
          <h2 className="font-semibold text-slate-900">Subscription</h2>
        </div>

        <div className={`flex items-center gap-2 mb-4 text-sm font-medium ${isPro ? 'text-green-600' : 'text-slate-500'}`}>
          {isPro ? <CheckCircle2 size={16} /> : <Zap size={16} />}
          {isPro ? 'Pro plan — active' : 'Starter (free)'}
        </div>

        {isPro ? (
          hasSubscription ? (
            <button
              onClick={() => startTransition(() => createPortalSession(locale))}
              disabled={isPending}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {isPending ? '...' : 'Manage subscription'}
            </button>
          ) : (
            <p className="text-sm text-slate-500">Your Pro plan is active.</p>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Upgrade to Pro for $49/month — includes a 14-day free trial.</p>
            <button
              onClick={() => startTransition(() => createCheckoutSession(locale))}
              disabled={isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isPending ? 'Redirecting...' : 'Upgrade to Pro'}
            </button>
            <div>
              <Link href={`/${locale}/pricing`} className="text-xs text-slate-400 hover:text-slate-600">
                See full feature list →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
