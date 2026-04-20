'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Zap, Calendar, ExternalLink } from 'lucide-react'
import { createCheckoutSession, createPortalSession } from '@/lib/actions/billing-actions'
import { SectionCard } from '../SectionCard'

const PRO_FEATURES = [
  { en: 'Unlimited jobs & estimates', es: 'Jobs y estimates ilimitados' },
  { en: 'Team & technicians management', es: 'Gestión de equipo' },
  { en: 'Field mobile view + schedule', es: 'Vista móvil de campo + calendario' },
  { en: 'Digital signatures & contracts', es: 'Firmas digitales y contratos' },
  { en: 'Photo documentation', es: 'Documentación con fotos' },
  { en: 'AI Assistant', es: 'Asistente IA' },
  { en: 'SMS delivery + QuickBooks sync', es: 'Envío SMS + sync QuickBooks' },
  { en: 'Priority support', es: 'Soporte prioritario' },
]

type BillingInfo = {
  plan: 'starter' | 'pro'
  nextBillingDate: Date | null
  interval: 'month' | 'year' | null
  amount: number | null
  cancelAtPeriodEnd: boolean
}

export function BillingSection({
  locale,
  hasSubscription,
  billingInfo,
}: {
  locale: string
  hasSubscription: boolean
  billingInfo: BillingInfo
}) {
  const [isPending, startTransition] = useTransition()
  const es = locale === 'es'
  const isProPlan = billingInfo.plan === 'pro'

  return (
    <div className="space-y-4">
      {/* Current plan card */}
      <div
        className="rounded-xl p-6"
        style={{
          background: isProPlan
            ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
            : 'var(--wp-surface)',
          color: isProPlan ? 'white' : 'var(--wp-text)',
          border: isProPlan ? 'none' : '1px solid var(--wp-border-v2)',
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isProPlan ? <CheckCircle2 size={18} /> : <Zap size={18} />}
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ opacity: isProPlan ? 0.7 : 0.6 }}>
                {es ? 'Plan actual' : 'Current plan'}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isProPlan ? 'Pro' : (es ? 'Starter (gratis)' : 'Starter (free)')}
            </h2>
            {isProPlan && billingInfo.amount !== null && (
              <p className="text-sm mt-1" style={{ opacity: 0.85 }}>
                ${billingInfo.amount}/{billingInfo.interval === 'year' ? (es ? 'año' : 'yr') : (es ? 'mes' : 'mo')}
              </p>
            )}
          </div>
          {!isProPlan && (
            <button
              onClick={() => startTransition(() => createCheckoutSession(locale))}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--wp-brand)', color: 'var(--wp-text-inverse)' }}
            >
              {isPending ? '...' : (es ? 'Upgrade a Pro — $29/mes' : 'Upgrade to Pro — $29/mo')}
            </button>
          )}
        </div>

        {isProPlan && (
          <div className="mt-4 pt-4 flex items-center justify-between flex-wrap gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
            {billingInfo.nextBillingDate && (
              <div className="flex items-center gap-2 text-xs" style={{ opacity: 0.85 }}>
                <Calendar size={13} />
                {billingInfo.cancelAtPeriodEnd
                  ? (es ? 'Finaliza el ' : 'Cancels on ')
                  : (es ? 'Próximo cobro: ' : 'Next billing: ')}
                {billingInfo.nextBillingDate.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </div>
            )}
            {hasSubscription ? (
              <button
                onClick={() => startTransition(() => createPortalSession(locale))}
                disabled={isPending}
                className="text-xs font-medium inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--wp-text-inverse)', opacity: 0.9 }}
              >
                {es ? 'Administrar suscripción' : 'Manage subscription'} <ExternalLink size={11} />
              </button>
            ) : isProPlan ? (
              // Pro plan sin subscription Stripe (seeded/trial/grandfathered) — disparar checkout para completar billing setup.
              <button
                onClick={() => startTransition(() => createCheckoutSession(locale))}
                disabled={isPending}
                className="text-xs font-medium inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--wp-text-inverse)', opacity: 0.9 }}
              >
                {es ? 'Configurar facturación' : 'Set up billing'} <ExternalLink size={11} />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Features list */}
      <SectionCard
        title={isProPlan ? (es ? 'Qué incluye tu plan' : 'What your plan includes') : (es ? 'Pro incluye' : 'Pro includes')}
        subtitle={isProPlan ? undefined : (es ? 'Mejora para desbloquear todo' : 'Upgrade to unlock everything')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 py-4">
          {PRO_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--wp-text-2)' }}>
              <CheckCircle2 size={14} style={{ color: isProPlan ? 'var(--wp-success-v2)' : 'var(--wp-text-3)' }} />
              <span>{es ? f.es : f.en}</span>
            </div>
          ))}
        </div>
        {!isProPlan && (
          <div className="pt-3 pb-4">
            <Link href={`/${locale}/pricing`} className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
              {es ? 'Ver comparación completa →' : 'See full feature comparison →'}
            </Link>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
