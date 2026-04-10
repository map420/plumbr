'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/actions/clients'

export function NewClientClient() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
      router.push(`/${locale}/clients/${client.id}`)
    })
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Client</h1>
      <form onSubmit={handleSubmit} className="plumbr-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input name="name" required className="plumbr-input" placeholder="John Smith" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input name="email" type="email" className="plumbr-input" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input name="phone" className="plumbr-input" placeholder="(555) 000-0000" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <input name="address" className="plumbr-input" placeholder="123 Main St, City, State" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea name="notes" rows={3} className="plumbr-input resize-none" placeholder="Any additional notes..." />
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
  )
}
