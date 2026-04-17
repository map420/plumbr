'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Mail, Gift } from 'lucide-react'
import { createReferral } from '@/lib/actions/referrals'
import { StatusPill, type StatusTone } from '@/components/ui'

type Referral = {
  id: string
  referredEmail: string
  status: string
  reward: string
  createdAt: Date
}

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: 'Invited', tone: 'neutral' },
  signed_up: { label: 'Signed up', tone: 'info' },
  subscribed: { label: 'Paying', tone: 'success' },
}

export function ReferralsClient({ referrals: initial, referralLink }: { referrals: Referral[]; referralLink: string }) {
  const router = useRouter()
  const [referrals, setReferrals] = useState(initial)
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const paying = referrals.filter(r => r.status === 'subscribed').length
  const totalReward = referrals.reduce((s, r) => s + (parseFloat(r.reward) || 0), 0)

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
    <div className="p-4 md:p-8 space-y-5 max-w-4xl">
      <div>
        <h1 className="page-title mb-0">Referrals</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
          Invite other contractors and earn rewards.
        </p>
      </div>

      {/* Hero card — navy gradient */}
      <div className="wp-ai-card" style={{ padding: '24px' }}>
        <div className="flex items-start gap-4 relative">
          <div className="wp-ai-icon" style={{ width: 40, height: 40, background: 'rgb(255 255 255 / 0.1)' }}>
            <Gift size={18} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--wp-ai-accent)' }}>
              Refer & earn
            </div>
            <div className="text-lg font-bold tracking-tight" style={{ color: 'white' }}>Share plumbr, get rewarded</div>
            <p className="text-sm mt-1" style={{ color: 'rgb(255 255 255 / 0.75)', lineHeight: 1.5 }}>
              Each contractor who signs up via your link and subscribes earns you a reward.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                readOnly
                value={referralLink}
                onFocus={e => e.currentTarget.select()}
                className="flex-1 rounded-md px-3 py-2 text-xs font-mono select-all outline-none"
                style={{
                  background: 'rgb(255 255 255 / 0.08)',
                  color: 'white',
                  border: '1px dashed rgb(255 255 255 / 0.2)',
                }}
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
                style={{ background: 'var(--wp-ai-accent)', color: 'var(--wp-brand)' }}
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="hidden sm:block text-right">
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'rgb(255 255 255 / 0.5)' }}>Paying</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: 'white' }}>{paying}</div>
            {totalReward > 0 && (
              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--wp-ai-accent)' }}>
                +${totalReward.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite by email */}
      <form onSubmit={handleInvite} className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>Invite by email</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>We&apos;ll send a personalized invite link.</p>
          </div>
        </div>
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
        {error && (
          <p className="mt-2 text-xs" style={{ color: 'var(--wp-error-v2)' }}>{error}</p>
        )}
      </form>

      {/* List */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-3)' }}>
          Your referrals ({referrals.length})
        </h2>
        {referrals.length === 0 ? (
          <div className="card p-10 text-center text-sm" style={{ color: 'var(--wp-text-3)' }}>
            No referrals yet. Invite your first contractor above.
          </div>
        ) : (
          <div className="card overflow-hidden">
            {referrals.map((r, i) => {
              const meta = STATUS_META[r.status] ?? { label: r.status, tone: 'neutral' as StatusTone }
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text)' }}>
                      {r.referredEmail}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--wp-text-3)' }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {parseFloat(r.reward) > 0 && (
                      <p className="text-xs font-mono font-semibold" style={{ color: 'var(--wp-success-v2)' }}>
                        +${parseFloat(r.reward).toLocaleString()}
                      </p>
                    )}
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
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
