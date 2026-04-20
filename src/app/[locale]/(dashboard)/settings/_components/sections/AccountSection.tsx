'use client'

import { UserProfile } from '@clerk/nextjs'

export function AccountSection({ locale }: { locale: string }) {
  void locale
  return (
    <div className="wp-account-embed">
      <UserProfile routing="hash" />
    </div>
  )
}
