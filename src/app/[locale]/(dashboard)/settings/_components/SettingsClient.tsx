'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { createCheckoutSession, createPortalSession } from '@/lib/actions/billing'
import { CheckCircle2, CreditCard, Zap } from 'lucide-react'

export function SettingsClient({ locale, plan, hasSubscription }: { locale: string; plan: string; hasSubscription: boolean }) {
  const [isPending, startTransition] = useTransition()
  const isPro = plan === 'pro'

  return (
    <div className="space-y-4">
      <div className="plumbr-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={20} className="text-slate-600" />
          <h2 className="font-semibold text-slate-900">Subscription</h2>
        </div>

        <div className={`flex items-center gap-2 mb-4 text-sm font-medium ${isPro ? 'text-green-600' : 'text-slate-500'}`}>
          {isPro ? <CheckCircle2 size={16} /> : <Zap size={16} />}
          {isPro ? 'Pro plan — active' : 'Starter (free)'}
        </div>

        {isPro && hasSubscription ? (
          <button
            onClick={() => startTransition(() => createPortalSession(locale))}
            disabled={isPending}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {isPending ? '...' : 'Manage subscription'}
          </button>
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
