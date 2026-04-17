// Shared loading skeletons for dashboard segments. These are Server
// Components (no 'use client') so they ship zero JS and render instantly
// while the real page's RSC work is running on the server.

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-4 md:p-6 space-y-3 animate-pulse" aria-busy="true" aria-live="polite">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-40 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
        <div className="h-9 w-28 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
      </div>

      {/* Rows */}
      <div className="card divide-y" style={{ borderColor: 'var(--wp-border)' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-48 max-w-full rounded" style={{ background: 'var(--wp-bg-muted)' }} />
              <div className="h-3 w-32 max-w-full rounded" style={{ background: 'var(--wp-bg-muted)', opacity: 0.7 }} />
            </div>
            <div className="h-4 w-16 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
            <div className="h-6 w-20 rounded-full" style={{ background: 'var(--wp-bg-muted)' }} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl animate-pulse" aria-busy="true" aria-live="polite">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
          <div className="h-4 w-40 rounded" style={{ background: 'var(--wp-bg-muted)', opacity: 0.7 }} />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
          <div className="h-9 w-20 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
        </div>
      </div>

      {/* Body */}
      <div className="card p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-28 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
            <div className="h-4 w-36 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
          </div>
        ))}
      </div>

      {/* Line items */}
      <div className="card p-5 space-y-2">
        <div className="h-4 w-24 rounded mb-3" style={{ background: 'var(--wp-bg-muted)' }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded" style={{ background: 'var(--wp-bg-muted)', opacity: 0.6 }} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
      <div className="card p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
            <div className="h-10 rounded-lg" style={{ background: 'var(--wp-bg-muted)', opacity: 0.7 }} />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <div className="h-10 w-28 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
          <div className="h-10 w-24 rounded-lg" style={{ background: 'var(--wp-bg-muted)', opacity: 0.6 }} />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
