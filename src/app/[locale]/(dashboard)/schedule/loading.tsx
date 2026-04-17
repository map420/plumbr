export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
          <div className="h-9 w-9 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square rounded" style={{ background: 'var(--wp-bg-muted)', opacity: 0.5 }} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
