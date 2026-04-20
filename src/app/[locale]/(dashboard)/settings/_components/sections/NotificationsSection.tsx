'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, CheckCircle2, DollarSign, AlertTriangle, CreditCard, Mail, MessageSquare, Calendar, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { updateProfile } from '@/lib/actions/profile'
import { Toggle } from '@/components/ui'
import { SectionCard } from '../SectionCard'

export type NotificationsFormState = {
  emailDigestEnabled: boolean
  smsRemindersEnabled: boolean
  weeklyDigestEnabled: boolean
  notifyJobAssigned: boolean
  notifyEstimateApproved: boolean
  notifyInvoicePaid: boolean
  notifyInvoiceOverdue: boolean
  notifyPaymentReceived: boolean
}

type RowDef = {
  key: keyof NotificationsFormState
  label: { en: string; es: string }
  sub: { en: string; es: string }
  icon: LucideIcon
  warning?: (form: NotificationsFormState, smsPhoneConfigured: boolean, es: boolean) => string | undefined
}

const EVENT_ROWS: RowDef[] = [
  { key: 'notifyJobAssigned', label: { en: 'Project assigned', es: 'Proyecto asignado' }, sub: { en: 'When a tech or you gets a new project', es: 'Cuando asignan un proyecto' }, icon: Briefcase },
  { key: 'notifyEstimateApproved', label: { en: 'Estimate approved', es: 'Estimate aprobado' }, sub: { en: 'Client accepts an estimate', es: 'Cliente acepta un estimate' }, icon: CheckCircle2 },
  { key: 'notifyInvoicePaid', label: { en: 'Invoice paid', es: 'Invoice pagado' }, sub: { en: 'Payment confirmed on an invoice', es: 'Pago confirmado' }, icon: DollarSign },
  { key: 'notifyInvoiceOverdue', label: { en: 'Invoice overdue', es: 'Invoice vencido' }, sub: { en: 'Auto-flag past due date', es: 'Auto-flag pasada fecha' }, icon: AlertTriangle },
  { key: 'notifyPaymentReceived', label: { en: 'Payment received', es: 'Pago recibido' }, sub: { en: 'Manual or Stripe payment logged', es: 'Pago manual o Stripe' }, icon: CreditCard },
]

const CHANNEL_ROWS: RowDef[] = [
  { key: 'emailDigestEnabled', label: { en: 'Daily email digest', es: 'Resumen diario email' }, sub: { en: 'Prior day summary', es: 'Resumen del día anterior' }, icon: Mail },
  {
    key: 'smsRemindersEnabled',
    label: { en: 'SMS reminders', es: 'Recordatorios SMS' },
    sub: { en: 'Urgent alerts to your phone', es: 'Alertas urgentes al móvil' },
    icon: MessageSquare,
    warning: (f, smsOk, es) => f.smsRemindersEnabled && !smsOk
      ? (es ? 'Configura un número en Integrations > SMS' : 'Set a number in Integrations > SMS')
      : undefined,
  },
  { key: 'weeklyDigestEnabled', label: { en: 'Weekly digest', es: 'Resumen semanal' }, sub: { en: 'Every Monday morning', es: 'Cada lunes' }, icon: Calendar },
]

export function NotificationsSection({
  initial,
  locale,
  baseProfile,
  smsPhoneConfigured,
}: {
  initial: NotificationsFormState
  locale: string
  baseProfile: { name: string; companyName: string; phone: string }
  smsPhoneConfigured: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pendingKeys, setPendingKeys] = useState<Set<keyof NotificationsFormState>>(new Set())
  const [, startTransition] = useTransition()
  const es = locale === 'es'

  function commitOne(key: keyof NotificationsFormState, value: boolean) {
    const next = { ...form, [key]: value }
    setForm(next)
    setPendingKeys(p => new Set(p).add(key))
    startTransition(async () => {
      await updateProfile({ ...baseProfile, [key]: value })
      setPendingKeys(p => {
        const n = new Set(p)
        n.delete(key)
        return n
      })
      router.refresh()
    })
  }

  const eventsEnabled = EVENT_ROWS.filter(r => form[r.key]).length
  const channelsEnabled = CHANNEL_ROWS.filter(r => form[r.key]).length

  return (
    <div className="space-y-4">
      <SectionCard
        title={es ? 'Eventos' : 'Events'}
        subtitle={es ? 'Qué te notificamos cuando algo pasa' : 'What we notify you about when things happen'}
        headerRight={<CountBadge enabled={eventsEnabled} total={EVENT_ROWS.length} />}
      >
        {EVENT_ROWS.map((row, i) => (
          <NotifRow
            key={row.key}
            row={row}
            checked={form[row.key] as boolean}
            pending={pendingKeys.has(row.key)}
            onChange={v => commitOne(row.key, v)}
            warning={row.warning?.(form, smsPhoneConfigured, es)}
            es={es}
            isFirst={i === 0}
          />
        ))}
      </SectionCard>

      <SectionCard
        title={es ? 'Canales' : 'Channels'}
        subtitle={es ? 'Cómo prefieres recibir las alertas' : 'How you want to receive alerts'}
        headerRight={<CountBadge enabled={channelsEnabled} total={CHANNEL_ROWS.length} />}
      >
        {CHANNEL_ROWS.map((row, i) => (
          <NotifRow
            key={row.key}
            row={row}
            checked={form[row.key] as boolean}
            pending={pendingKeys.has(row.key)}
            onChange={v => commitOne(row.key, v)}
            warning={row.warning?.(form, smsPhoneConfigured, es)}
            es={es}
            isFirst={i === 0}
          />
        ))}
      </SectionCard>
    </div>
  )
}

function NotifRow({
  row, checked, onChange, pending, warning, es, isFirst,
}: {
  row: RowDef
  checked: boolean
  onChange: (v: boolean) => void
  pending: boolean
  warning?: string
  es: boolean
  isFirst: boolean
}) {
  const { icon: Icon, label, sub } = row
  return (
    <div
      className="flex items-center gap-3 py-4 transition-opacity"
      style={{
        opacity: checked ? 1 : 0.55,
        borderTop: isFirst ? undefined : '1px solid var(--wp-border-light)',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--wp-surface-2)' }}
      >
        <Icon size={16} style={{ color: 'var(--wp-text-3)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>
          {es ? label.es : label.en}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
          {es ? sub.es : sub.en}
        </p>
        {warning && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--wp-warning-v2)' }}>⚠ {warning}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {pending && <Loader2 size={12} className="animate-spin" style={{ color: 'var(--wp-text-3)' }} />}
        <Toggle checked={checked} onChange={onChange} disabled={pending} aria-label={es ? label.es : label.en} />
      </div>
    </div>
  )
}

function CountBadge({ enabled, total }: { enabled: number; total: number }) {
  const allOn = enabled === total
  const allOff = enabled === 0
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
      style={{
        background: allOn ? 'var(--wp-success-bg-v2)' : allOff ? 'var(--wp-surface-3)' : 'var(--wp-info-bg-v2)',
        color: allOn ? 'var(--wp-success-v2)' : allOff ? 'var(--wp-text-3)' : 'var(--wp-info-v2)',
      }}
    >
      {enabled}/{total}
    </span>
  )
}
