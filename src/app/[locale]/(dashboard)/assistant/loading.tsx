export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="flex justify-end">
        <div className="h-14 w-3/5 rounded-2xl" style={{ background: 'var(--wp-bg-muted)' }} />
      </div>
      <div className="flex justify-start">
        <div className="h-24 w-4/5 rounded-2xl" style={{ background: 'var(--wp-bg-muted)', opacity: 0.7 }} />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-2/5 rounded-2xl" style={{ background: 'var(--wp-bg-muted)' }} />
      </div>
      <div className="flex justify-start">
        <div className="h-20 w-4/5 rounded-2xl" style={{ background: 'var(--wp-bg-muted)', opacity: 0.7 }} />
      </div>
      <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto">
        <div className="h-12 rounded-xl" style={{ background: 'var(--wp-bg-muted)' }} />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
