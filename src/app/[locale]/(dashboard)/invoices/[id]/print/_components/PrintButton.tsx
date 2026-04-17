'use client'

export function PrintControls() {
  return (
    <div className="no-print flex items-center gap-3 px-8 py-3" style={{ borderBottom: '1px solid var(--wp-border)', background: 'var(--wp-bg-muted)' }}>
      <button onClick={() => window.print()} className="btn-primary text-sm">Print / Save PDF</button>
      <button onClick={() => history.back()} className="btn-secondary text-sm">Close</button>
    </div>
  )
}

// Keep old export for backwards compatibility
export function PrintButton() {
  return null
}
