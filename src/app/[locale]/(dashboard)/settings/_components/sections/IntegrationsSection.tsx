'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard, Link2, Unplug, AlertCircle, Lock, ExternalLink } from 'lucide-react'
import { updateProfile } from '@/lib/actions/profile'
import { disconnectQbo } from '@/lib/actions/integrations'
import { startStripeConnectOnboarding, openStripeExpressDashboard, disconnectStripeAccount, syncStripeConnectStatus } from '@/lib/actions/stripe-connect'
import { Toggle } from '@/components/ui'
import { FormRow } from '../FormRow'
import { SectionCard } from '../SectionCard'

export type IntegrationsFormState = {
  acceptAch: boolean
  coverProcessingFee: boolean
  smsEnabled: boolean
  smsPhoneNumber: string
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

type QboInfo = {
  connected: boolean
  realmId?: string
  lastActivity?: Date
}

export function IntegrationsSection({
  initial,
  locale,
  baseProfile,
  stripeInfo,
  stripeConnect,
  qboInfo,
  isProPlan,
}: {
  initial: IntegrationsFormState
  locale: string
  baseProfile: { name: string; companyName: string; phone: string }
  stripeInfo: StripeInfo
  stripeConnect: StripeConnectInfo
  qboInfo: QboInfo
  isProPlan: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [savedSms, setSavedSms] = useState(false)
  const [connect, setConnect] = useState(stripeConnect)
  const es = locale === 'es'

  // Tras volver del onboarding de Stripe Connect (?stripe=return), sync status al DB
  // y refresh UI para mostrar estado actualizado sin requerir reload manual.
  useEffect(() => {
    if (searchParams.get('stripe') === 'return') {
      startTransition(async () => {
        const fresh = await syncStripeConnectStatus()
        if (fresh) setConnect(c => ({ ...c, ...fresh }))
        router.refresh()
      })
    }
  }, [searchParams, router])

  const connectState: 'disconnected' | 'pending' | 'active' =
    !connect.accountId ? 'disconnected'
    : connect.chargesEnabled && connect.payoutsEnabled ? 'active'
    : 'pending'

  const smsDirty = form.smsEnabled !== initial.smsEnabled || form.smsPhoneNumber !== initial.smsPhoneNumber

  function toggle(key: 'acceptAch' | 'coverProcessingFee') {
    const next = { ...form, [key]: !form[key] }
    setForm(next)
    startTransition(async () => {
      await updateProfile({ ...baseProfile, [key]: next[key] })
      router.refresh()
    })
  }

  function commitSms() {
    startTransition(async () => {
      await updateProfile({ ...baseProfile, smsEnabled: form.smsEnabled, smsPhoneNumber: form.smsPhoneNumber })
      setSavedSms(true)
      setTimeout(() => setSavedSms(false), 2000)
      router.refresh()
    })
  }

  function handleQboDisconnect() {
    startTransition(async () => {
      await disconnectQbo()
      router.refresh()
    })
  }

  const stripeStatusBadge = stripeInfo.connected ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
      <CheckCircle2 size={11} /> {es ? 'Conectado' : 'Connected'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
      <AlertCircle size={11} /> {es ? 'No conectado' : 'Not connected'}
    </span>
  )

  return (
    <div className="space-y-4">
      {/* Stripe Connect — contractor's account to receive client payments */}
      <SectionCard
        title={es ? 'Stripe Connect · Cobrar a clientes' : 'Stripe Connect · Accept client payments'}
        subtitle={es
          ? 'Conecta tu cuenta de Stripe para recibir pagos de facturas directo en tu banco (0% comisión de plataforma).'
          : 'Connect your Stripe account to receive invoice payments directly in your bank (0% platform fee).'}
      >
        {!isProPlan ? (
          <FormRow label={es ? 'Plan requerido' : 'Plan required'}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-warning-bg-v2)', color: 'var(--wp-warning-v2)' }}>
                <Lock size={11} /> {es ? 'Requiere Pro' : 'Pro plan required'}
              </span>
              <Link href={`/${locale}/pricing`} className="text-xs font-medium" style={{ color: 'var(--wp-brand)' }}>
                {es ? 'Ver planes →' : 'See plans →'}
              </Link>
            </div>
          </FormRow>
        ) : connectState === 'disconnected' ? (
          <FormRow label={es ? 'Estado' : 'Status'}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
                <AlertCircle size={11} /> {es ? 'No conectado' : 'Not connected'}
              </span>
              <button
                type="button"
                onClick={() => startTransition(() => startStripeConnectOnboarding(locale))}
                disabled={isPending}
                className="btn-primary btn-sm"
              >
                <Link2 size={13} /> {es ? 'Conectar cuenta Stripe' : 'Connect Stripe account'}
              </button>
            </div>
          </FormRow>
        ) : connectState === 'pending' ? (
          <>
            <FormRow label={es ? 'Estado' : 'Status'}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-warning-bg-v2)', color: 'var(--wp-warning-v2)' }}>
                  <AlertCircle size={11} /> {es ? 'Configuración pendiente' : 'Setup incomplete'}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => startStripeConnectOnboarding(locale))}
                  disabled={isPending}
                  className="btn-primary btn-sm"
                >
                  <ExternalLink size={13} /> {es ? 'Continuar configuración' : 'Complete setup'}
                </button>
              </div>
            </FormRow>
            {connect.requirementsCurrentlyDue.length > 0 && (
              <FormRow label={es ? 'Falta' : 'Missing'}>
                <ul className="text-xs space-y-1" style={{ color: 'var(--wp-text-3)' }}>
                  {connect.requirementsCurrentlyDue.slice(0, 5).map(req => (
                    <li key={req}>• {req.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </FormRow>
            )}
          </>
        ) : (
          <>
            <FormRow label={es ? 'Estado' : 'Status'}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                  <CheckCircle2 size={11} /> {es ? 'Activo' : 'Active'}
                </span>
                <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>
                  {es ? 'Cobros y payouts habilitados' : 'Charges and payouts enabled'}
                </span>
              </div>
            </FormRow>
            <FormRow label={es ? 'Dashboard' : 'Dashboard'} subtitle={es ? 'Ver tus pagos, payouts y reportes en Stripe' : 'View your payments, payouts and reports in Stripe'}>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => startTransition(() => openStripeExpressDashboard(locale))}
                  disabled={isPending}
                  className="btn-secondary btn-sm"
                >
                  <ExternalLink size={13} /> {es ? 'Abrir dashboard Stripe' : 'Open Stripe dashboard'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(es ? '¿Desconectar Stripe? Dejarás de recibir pagos hasta reconectar.' : 'Disconnect Stripe? You will stop receiving payments until reconnected.')) return
                    startTransition(async () => {
                      await disconnectStripeAccount()
                      setConnect({ accountId: null, chargesEnabled: false, payoutsEnabled: false, requirementsCurrentlyDue: [], requirementsPastDue: [] })
                      router.refresh()
                    })
                  }}
                  disabled={isPending}
                  className="btn-ghost btn-sm"
                  style={{ color: 'var(--wp-error-v2)' }}
                >
                  <Unplug size={13} /> {es ? 'Desconectar' : 'Disconnect'}
                </button>
              </div>
            </FormRow>
          </>
        )}
      </SectionCard>

      {/* Stripe */}
      <SectionCard
        title="Stripe"
        subtitle={es ? 'Pagos en estimates e invoices' : 'Payments on estimates and invoices'}
      >
        <FormRow label={es ? 'Estado' : 'Status'}>
          <div className="flex items-center gap-2 flex-wrap">
            {stripeStatusBadge}
            {stripeInfo.paymentMethodLast4 && (
              <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wp-text-2)' }}>
                <CreditCard size={12} />
                {stripeInfo.paymentMethodBrand ?? 'Card'} •••• {stripeInfo.paymentMethodLast4}
              </span>
            )}
            {!stripeInfo.connected && (
              <Link href={`/${locale}/settings?tab=billing`} className="text-xs font-medium" style={{ color: 'var(--wp-brand)' }}>
                {es ? 'Conectar desde Billing →' : 'Connect from Billing →'}
              </Link>
            )}
          </div>
        </FormRow>
        <FormRow
          label={es ? 'Aceptar ACH' : 'Accept ACH'}
          subtitle={es ? 'Transferencias bancarias — 1% hasta $15' : 'Bank transfers — 1% capped at $15'}
        >
          <Toggle checked={form.acceptAch} onChange={() => toggle('acceptAch')} disabled={isPending} aria-label="Accept ACH" />
        </FormRow>
        <FormRow
          label={es ? 'Cliente paga la comisión' : 'Cover processing fee'}
          subtitle={es ? 'Pasa la comisión de procesamiento al cliente' : 'Pass the processing fee to the client'}
        >
          <Toggle checked={form.coverProcessingFee} onChange={() => toggle('coverProcessingFee')} disabled={isPending} aria-label="Cover processing fee" />
        </FormRow>
      </SectionCard>

      {/* QuickBooks */}
      <SectionCard
        title="QuickBooks"
        subtitle={es ? 'Sincroniza facturas y clientes con QuickBooks Online' : 'Sync invoices and clients to QuickBooks Online'}
      >
        {!isProPlan ? (
          <FormRow label={es ? 'Disponibilidad' : 'Availability'}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-warning-bg-v2)', color: 'var(--wp-warning-v2)' }}>
              <Lock size={11} /> {es ? 'Disponible en plan Pro' : 'Available on Pro plan'}
            </span>
          </FormRow>
        ) : (
          <>
            <FormRow label={es ? 'Estado' : 'Status'}>
              {qboInfo.connected ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                    <CheckCircle2 size={11} /> {es ? 'Conectado' : 'Connected'}
                  </span>
                  {qboInfo.realmId && (
                    <span className="text-xs" style={{ color: 'var(--wp-text-3)' }}>Realm {qboInfo.realmId}</span>
                  )}
                </div>
              ) : (
                <Link href="/api/qbo/connect" className="btn-primary btn-sm inline-flex items-center gap-1.5">
                  <Link2 size={13} /> {es ? 'Conectar QuickBooks' : 'Connect QuickBooks'}
                </Link>
              )}
            </FormRow>
            {qboInfo.connected && qboInfo.lastActivity && (
              <FormRow label={es ? 'Última actividad' : 'Last activity'}>
                <span className="text-xs" style={{ color: 'var(--wp-text-2)' }}>
                  {new Date(qboInfo.lastActivity).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </FormRow>
            )}
            {qboInfo.connected && (
              <FormRow label={es ? 'Acciones' : 'Actions'}>
                <button
                  type="button"
                  onClick={handleQboDisconnect}
                  disabled={isPending}
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Unplug size={12} /> {es ? 'Desconectar' : 'Disconnect'}
                </button>
              </FormRow>
            )}
          </>
        )}
      </SectionCard>

      {/* SMS */}
      <SectionCard
        title="SMS"
        subtitle={es ? 'Envía mensajes a clientes desde la app' : 'Text clients from the app'}
        footer={
          smsDirty ? (
            <>
              {savedSms && <span className="text-xs font-medium mr-2" style={{ color: 'var(--wp-success-v2)' }}>{es ? 'Guardado ✓' : 'Saved ✓'}</span>}
              <button
                type="button"
                onClick={() => setForm(initial)}
                disabled={isPending}
                className="btn-secondary btn-sm disabled:opacity-40"
              >
                {es ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={commitSms}
                disabled={isPending}
                className="btn-primary btn-sm disabled:opacity-40"
              >
                {isPending ? (es ? 'Guardando…' : 'Saving…') : (es ? 'Guardar' : 'Save')}
              </button>
            </>
          ) : undefined
        }
      >
        {!isProPlan ? (
          <FormRow label={es ? 'Disponibilidad' : 'Availability'}>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--wp-warning-bg-v2)', color: 'var(--wp-warning-v2)' }}>
              <Lock size={11} /> {es ? 'Disponible en plan Pro' : 'Available on Pro plan'}
            </span>
          </FormRow>
        ) : (
          <>
            <FormRow
              label={es ? 'Habilitado' : 'Enabled'}
              subtitle={es ? 'Activa el envío de SMS' : 'Allow SMS sending'}
            >
              <Toggle
                checked={form.smsEnabled}
                onChange={v => setForm(f => ({ ...f, smsEnabled: v }))}
                aria-label="SMS enabled"
              />
            </FormRow>
            {form.smsEnabled && (
              <FormRow
                label={es ? 'Número de envío' : 'Sender number'}
                subtitle={es ? 'Teléfono de origen para SMS' : 'Phone used as the sender'}
              >
                <input
                  type="tel"
                  className="input w-full max-w-xs"
                  value={form.smsPhoneNumber}
                  onChange={e => setForm(f => ({ ...f, smsPhoneNumber: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </FormRow>
            )}
          </>
        )}
      </SectionCard>
    </div>
  )
}
