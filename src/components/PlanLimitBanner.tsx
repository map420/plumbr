'use client'

import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useState, useEffect } from 'react'

export function PlanLimitBanner({ current, limit, resource }: { current: number; limit: number; resource: string }) {
  const locale = useLocale()
  const storageKey = `plumbr_banner_dismissed_${resource}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === '1')
  }, [storageKey])

  const pct = Math.round((current / limit) * 100)
  if (pct < 60 || dismissed) return null

  const atLimit = current >= limit

  function handleDismiss() {
    localStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

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
      <button onClick={handleDismiss} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  )
}
