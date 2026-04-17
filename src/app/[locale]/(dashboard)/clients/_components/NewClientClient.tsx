'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/actions/clients'
import { Toast } from '@/components/Toast'
import { ChevronLeft } from 'lucide-react'

export function NewClientClient() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const client = await createClient({
        name: fd.get('name') as string,
        email: fd.get('email') as string,
        phone: fd.get('phone') as string,
        address: fd.get('address') as string,
        notes: fd.get('notes') as string,
      })
      setSaved(true)
      router.push(`/${locale}/clients/${client.id}`)
    })
  }

  return (
    <>
      {saved && <Toast message="Client saved successfully!" onDone={() => setSaved(false)} />}

      {/* ── MOBILE LAYOUT ─────────────────────── */}
      <div className="md:hidden bg-white min-h-full">
        {/* Header: Cancel | New Client | Done */}
        <form onSubmit={handleSubmit} id="client-form">
          <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
            <div className="flex-1 flex items-center justify-start">
              <button type="button" onClick={() => router.back()}
                className="flex items-center gap-0.5"
                style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
                <ChevronLeft size={16} /> Cancel
              </button>
            </div>
            <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>New Client</span>
            <div className="flex-1 flex items-center justify-end">
              <button type="submit" disabled={isPending}
                style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
                {isPending ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>

          <div className="px-4 pt-4 pb-20 space-y-5">
            {/* CONTACT section */}
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contact</p>
              <div className="space-y-3">
                <input name="name" required className="input" placeholder="Name *" />
                <input name="email" type="email" className="input" placeholder="Email" />
                <input name="phone" className="input" placeholder="Phone" />
              </div>
            </div>

            {/* ADDRESS section */}
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Address</p>
              <input name="address" className="input" placeholder="123 Main St, City, State" />
            </div>

            {/* NOTES section */}
            <div>
              <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Notes</p>
              <textarea name="notes" rows={3} className="input resize-none" placeholder="Any additional notes..." />
            </div>
          </div>
        </form>
      </div>

      {/* ── DESKTOP LAYOUT ─────────────────────── */}
      <div className="hidden md:block p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--wp-text-primary)' }}>New Client</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Name *</label>
            <input name="name" required className="input" placeholder="John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Email</label>
              <input name="email" type="email" className="input" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Phone</label>
              <input name="phone" className="input" placeholder="(555) 000-0000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Address</label>
            <input name="address" className="input" placeholder="123 Main St, City, State" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Notes</label>
            <textarea name="notes" rows={3} className="input resize-none" placeholder="Any additional notes..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Saving...' : 'Save Client'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
