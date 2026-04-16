'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Mail } from 'lucide-react'
import { createReferral } from '@/lib/actions/referrals'

type Referral = {
  id: string
  referredEmail: string
  status: string
  reward: string
  createdAt: Date
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Invited', color: 'var(--wp-text-muted)' },
  signed_up: { label: 'Signed up', color: 'var(--wp-primary)' },
  subscribed: { label: 'Paying', color: 'var(--wp-success)' },
}

export function ReferralsClient({ referrals: initial, referralLink }: { referrals: Referral[]; referralLink: string }) {
  const router = useRouter()
  const [referrals, setReferrals] = useState(initial)
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function copyLink() {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.')
      return
    }
    if (referrals.some(r => r.referredEmail.toLowerCase() === trimmed.toLowerCase())) {
      setError('You already referred this email.')
      return
    }
    startTransition(async () => {
      try {
        const created = await createReferral(trimmed)
        setReferrals(prev => [created as Referral, ...prev])
        setEmail('')
        router.refresh()
      } catch (err) {
        setError((err as Error)?.message ?? 'Something went wrong.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Share link */}
      <div className="card p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-muted)' }}>
          Your referral link
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="input text-sm flex-1 font-mono"
            onFocus={e => e.currentTarget.select()}
          />
          <button onClick={copyLink} className="btn-primary text-sm whitespace-nowrap flex items-center gap-1.5">
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--wp-text-muted)' }}>
          Share this anywhere. New signups who use it will be linked to your account.
        </p>
      </div>

      {/* Invite by email */}
      <form onSubmit={handleInvite} className="card p-4">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-muted)' }}>
          Invite by email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="contractor@example.com"
            className="input text-sm flex-1"
          />
          <button type="submit" disabled={isPending || !email.trim()} className="btn-primary text-sm disabled:opacity-50 flex items-center gap-1.5">
            <Mail size={14} /> {isPending ? '...' : 'Invite'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs" style={{ color: 'var(--wp-error)' }}>{error}</p>}
      </form>

      {/* List */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-muted)' }}>
          Your referrals ({referrals.length})
        </h2>
        {referrals.length === 0 ? (
          <p className="text-sm text-center py-6 card" style={{ color: 'var(--wp-text-muted)' }}>
            No referrals yet. Invite your first contractor above.
          </p>
        ) : (
          <div className="card overflow-hidden">
            {referrals.map((r, i) => {
              const meta = STATUS_LABEL[r.status] ?? { label: r.status, color: 'var(--wp-text-muted)' }
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>
                      {r.referredEmail}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--wp-text-muted)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</p>
                    {parseFloat(r.reward) > 0 && (
                      <p className="text-[11px] font-mono" style={{ color: 'var(--wp-success)' }}>
                        +${parseFloat(r.reward).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
