'use client'

import { useState, FormEvent } from 'react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-green-600 font-semibold text-sm">
        You&apos;re subscribed! Check your inbox.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-[#F97316] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#ea6c0a] transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-red-500 text-xs mt-1 sm:mt-0 sm:self-center">Something went wrong. Try again.</p>
      )}
    </form>
  )
}
