'use client'

import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'
import { ClientAvatar } from '@/components/ui'

export type TechStats = {
  id: string; name: string; email: string; phone: string | null; hourlyRate: string | null
  type: 'employee' | 'subcontractor'
  role: string | null
  tier: string | null
  rating: string | null
  availabilityStatus: 'available' | 'busy' | 'off' | null
  availabilityNote: string | null
  jobsMtd: number
  revenueMtd: number
  paidOutMtd: number
  activeJobContext: { jobId: string; jobName: string; clientName: string } | null
}

type Props = {
  tech: TechStats
  locale: string
}

const STATUS_META: Record<string, { color: string; label: { es: string; en: string } }> = {
  available: { color: 'var(--wp-success-v2)', label: { es: 'Disponible', en: 'Available' } },
  busy: { color: 'var(--wp-error-v2)', label: { es: 'En obra', en: 'Busy' } },
  off: { color: 'var(--wp-text-3)', label: { es: 'Off today', en: 'Off today' } },
}

function formatMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

export function TechnicianCard({ tech, locale }: Props) {
  const isSub = tech.type === 'subcontractor'
  const es = locale === 'es'
  const moneyValue = isSub ? tech.paidOutMtd : tech.revenueMtd
  const moneyLabel = isSub ? (es ? 'Paid out' : 'Paid out') : (es ? 'Revenue' : 'Revenue')

  // Status: prefer explicit availabilityStatus; infer busy from activeJobContext otherwise
  const effectiveStatus = tech.availabilityStatus ?? (tech.activeJobContext ? 'busy' : null)
  const statusMeta = effectiveStatus ? STATUS_META[effectiveStatus] : null

  // Status note — E9 fix: preferir contexto de assignment real sobre la nota manual
  // (así Diego no aparece como "Garbage disposal" si su job real es otro).
  const statusNote = tech.activeJobContext
    ? `${tech.activeJobContext.jobName} · ${tech.activeJobContext.clientName}`
    : tech.availabilityNote

  // Contextual action — E10 fix: "View job" → /jobs/{activeJobId}, no /team/{techId}
  const action = isSub
    ? { label: es ? 'Contactar' : 'Contact', href: `mailto:${tech.email}` }
    : effectiveStatus === 'busy' && tech.activeJobContext
      ? { label: es ? 'Ver job' : 'View job', href: `/${locale}/projects/${tech.activeJobContext.jobId}` }
      : effectiveStatus === 'busy'
        ? { label: es ? 'Ver perfil' : 'View profile', href: `/${locale}/team/${tech.id}` }
        : { label: es ? 'Asignar' : 'Assign', href: `/${locale}/projects?assign=${tech.id}` }

  const roleLine = [tech.role, tech.tier].filter(Boolean).join(' · ')
  const rating = tech.rating ? parseFloat(tech.rating) : null

  return (
    <div
      className="rounded-xl p-5 transition-all hover:shadow-md"
      style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)' }}
    >
      {/* Header: avatar + name + role */}
      <Link href={`/${locale}/team/${tech.id}`} className="flex items-center gap-3 group">
        <ClientAvatar
          name={tech.name}
          size="lg"
          color={isSub ? '#8B5CF6' : undefined}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate group-hover:underline" style={{ color: 'var(--wp-text)' }}>
            {tech.name}
          </p>
          {roleLine && (
            <p className="text-xs truncate" style={{ color: 'var(--wp-text-3)' }}>{roleLine}</p>
          )}
        </div>
      </Link>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
        <Kpi label={es ? 'Jobs MTD' : 'Jobs MTD'} value={tech.jobsMtd.toString()} />
        <Kpi label={moneyLabel} value={moneyValue > 0 ? formatMoney(moneyValue) : '—'} />
        <Kpi
          label={es ? 'Rating' : 'Rating'}
          value={rating !== null ? rating.toFixed(1) : '—'}
          icon={rating !== null ? <Star size={10} style={{ color: '#F59E0B' }} fill="#F59E0B" /> : undefined}
        />
      </div>

      {/* Status + action */}
      <div className="flex items-center justify-between mt-4 pt-3 text-xs" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {statusMeta && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: statusMeta.color }}
            />
          )}
          <span className="truncate" style={{ color: 'var(--wp-text-2)' }}>
            {statusMeta && <span className="font-medium">{statusMeta.label[es ? 'es' : 'en']}</span>}
            {statusMeta && statusNote && <span style={{ color: 'var(--wp-text-3)' }}> · </span>}
            {statusNote && <span style={{ color: 'var(--wp-text-3)' }}>{statusNote}</span>}
            {!statusMeta && !statusNote && <span style={{ color: 'var(--wp-text-3)' }}>—</span>}
          </span>
        </div>
        <Link
          href={action.href}
          className="flex items-center gap-0.5 font-medium shrink-0 ml-2"
          style={{ color: 'var(--wp-brand)' }}
        >
          {action.label} <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  )
}

function Kpi({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--wp-text-3)' }}>
        {label}
      </p>
      <p className="text-base font-bold tabular-nums flex items-center gap-1" style={{ color: 'var(--wp-text)' }}>
        {icon}{value}
      </p>
    </div>
  )
}
