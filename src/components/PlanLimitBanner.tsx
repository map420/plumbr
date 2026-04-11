'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useLocale } from 'next-intl'

export function PlanLimitBanner({ current, limit, resource }: { current: number; limit: number; resource: string }) {
  const locale = useLocale()
  const pct = Math.round((current / limit) * 100)
  if (pct < 60) return null

  const atLimit = current >= limit
  return (
    <div className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${atLimit ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">
        {atLimit
          ? `You've reached the ${limit} ${resource} limit on the Starter plan.`
          : `${current} of ${limit} ${resource} used on the Starter plan.`}
      </span>
      <Link href={`/${locale}/pricing`} className="font-semibold underline whitespace-nowrap">
        Upgrade to Pro
      </Link>
    </div>
  )
}
