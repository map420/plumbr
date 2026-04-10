'use client'

import { useTransition } from 'react'
import { createCheckoutSession } from '@/lib/actions/billing'

export function CheckoutButton({ locale }: { locale: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => createCheckoutSession(locale))}
      disabled={isPending}
      className="w-full py-3 rounded-xl bg-[#F97316] text-white font-semibold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Redirecting...' : 'Start free trial'}
    </button>
  )
}
