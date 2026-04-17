'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="p-8 max-w-lg mx-auto text-center space-y-4" role="alert">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--wp-text-primary)' }}>
        Something went wrong
      </h2>
      <p className="text-sm" style={{ color: 'var(--wp-text-secondary)' }}>
        We couldn&apos;t load this page. Try again, or head back to the dashboard.
      </p>
      {error.digest && (
        <p className="text-xs font-mono" style={{ color: 'var(--wp-text-muted)' }}>
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-2 justify-center pt-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--wp-accent)', color: 'white' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
