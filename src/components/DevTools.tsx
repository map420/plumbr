'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Beaker, Database, Trash2, X, Loader2 } from 'lucide-react'
import { seedTestData, wipeMyData } from '@/lib/actions/dev-tools'

export function DevTools() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  function handleSeed() {
    setMessage(null)
    startTransition(async () => {
      try {
        const r = await seedTestData()
        setMessage(
          `✓ ${r.clients}c · ${r.jobs}j · ${r.estimates}est · ${r.invoices}inv · ${r.payments}pay · ${r.technicians}t ` +
          `· ${r.expenses}exp · ${r.shoppingLists}sl(${r.shoppingListItems}i) · ${r.changeOrders}co · ${r.workOrders}wo ` +
          `· ${r.contracts}ctr · ${r.notifications}n · ${r.referrals}ref · ${r.aiPreferences}ai · ${r.catalogItems}cat · ${r.lineItems}li · ${r.jobChecklistItems}chk`
        )
        router.refresh()
      } catch (e) {
        setMessage(`Error: ${e instanceof Error ? e.message : 'failed'}`)
      }
    })
  }

  function handleWipe() {
    setMessage(null)
    startTransition(async () => {
      try {
        await wipeMyData()
        setMessage('All data wiped ✓')
        setConfirmWipe(false)
        router.refresh()
      } catch (e) {
        setMessage(`Error: ${e instanceof Error ? e.message : 'failed'}`)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 rounded-full shadow-lg flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
        style={{ background: '#7C3AED', color: 'var(--wp-text-inverse)' }}
        title="Dev tools"
      >
        <Beaker size={14} />
        DEV
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-40 rounded-xl shadow-xl w-64"
      style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl"
        style={{ background: '#7C3AED', color: 'var(--wp-text-inverse)' }}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Beaker size={13} /> DEV TOOLS
        </div>
        <button onClick={() => { setOpen(false); setMessage(null); setConfirmWipe(false) }} className="opacity-80 hover:opacity-100">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <button
          onClick={handleSeed}
          disabled={isPending}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium text-left hover:bg-[var(--wp-surface-2)] disabled:opacity-50"
          style={{ color: 'var(--wp-text)' }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
          Seed demo data
        </button>

        {!confirmWipe ? (
          <button
            onClick={() => setConfirmWipe(true)}
            disabled={isPending}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm font-medium text-left hover:bg-[var(--wp-error-bg-v2)] disabled:opacity-50"
            style={{ color: 'var(--wp-error-v2)' }}
          >
            <Trash2 size={14} />
            Wipe my data
          </button>
        ) : (
          <div className="p-2 rounded-md space-y-2" style={{ background: 'var(--wp-error-bg-v2)' }}>
            <p className="text-xs" style={{ color: 'var(--wp-error-v2)' }}>
              Delete ALL clients, jobs, estimates, invoices, technicians, photos, etc. owned by you. Irreversible.
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={handleWipe}
                disabled={isPending}
                className="flex-1 px-2 py-1.5 rounded text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--wp-error-v2)' }}
              >
                {isPending ? 'Wiping…' : 'Confirm wipe'}
              </button>
              <button
                onClick={() => setConfirmWipe(false)}
                disabled={isPending}
                className="px-2 py-1.5 rounded text-xs font-semibold"
                style={{ background: 'var(--wp-surface)', color: 'var(--wp-text-2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {message && (
          <p
            className="text-[11px] px-2 py-1 rounded"
            style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-2)' }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
