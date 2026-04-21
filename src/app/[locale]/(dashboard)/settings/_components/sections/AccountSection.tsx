'use client'

import { SignOutButton, UserProfile } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

export function AccountSection({ locale }: { locale: string }) {
  const isEs = locale === 'es'
  return (
    <div className="space-y-6">
      <div className="wp-account-embed">
        <UserProfile routing="hash" />
      </div>

      <div
        className="rounded-lg border p-5 flex items-center justify-between gap-4"
        style={{
          background: 'var(--wp-surface)',
          borderColor: 'var(--wp-border-v2)',
        }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>
            {isEs ? 'Cerrar sesión' : 'Sign out'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
            {isEs
              ? 'Termina tu sesión en este dispositivo.'
              : 'End your session on this device.'}
          </div>
        </div>
        <SignOutButton>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--wp-error-bg)',
              color: 'var(--wp-error)',
              border: '1px solid #FECACA',
            }}
          >
            <LogOut size={14} />
            {isEs ? 'Cerrar sesión' : 'Sign out'}
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
