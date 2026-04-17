export default function Loading() {
  return (
    <div className="p-4 md:p-8 space-y-4 max-w-4xl animate-pulse" aria-busy="true" aria-live="polite">
      {/* Revenue card */}
      <div className="card p-4">
        <div className="flex items-stretch gap-4 mb-3">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
            <div className="h-7 w-32 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
            <div className="h-7 w-28 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
          </div>
        </div>
        <div className="flex gap-1.5 pt-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 h-7 rounded-lg" style={{ background: 'var(--wp-bg-muted)' }} />
          ))}
        </div>
      </div>

      {/* Action list */}
      <div className="card p-4 space-y-3">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
        {[0, 1, 2].map(i => (
          <div key={i} className="h-5 w-full rounded" style={{ background: 'var(--wp-bg-muted)' }} />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="card p-4 space-y-3">
        <div className="h-3 w-40 rounded" style={{ background: 'var(--wp-bg-muted)' }} />
        <div className="h-[130px] rounded" style={{ background: 'var(--wp-bg-muted)' }} />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
