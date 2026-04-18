'use client'

import Link from 'next/link'

type Item = { id: string; description: string; estimatedCost: string; status: string; vendor?: string | null }
type JobSummary = { id: string; name: string; clientName: string; status: string }

export function ShoppingListSidebar({
  items, job, locale,
}: {
  items: Item[]
  job: JobSummary | null
  locale: string
}) {
  const purchasedItems = items.filter(it => it.status === 'purchased')
  const pendingItems = items.filter(it => it.status === 'pending')
  const total = items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  const alreadyBought = purchasedItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  const remaining = pendingItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)

  const vendorGroups = items.reduce<Record<string, Item[]>>((acc, it) => {
    const key = it.vendor || (locale === 'es' ? 'Sin proveedor' : 'No vendor')
    if (!acc[key]) acc[key] = []
    acc[key].push(it)
    return acc
  }, {})
  const vendorEntries = Object.entries(vendorGroups)
  const hasRealVendors = vendorEntries.some(([v]) => v !== 'Sin proveedor' && v !== 'No vendor')

  return (
    <>
      {/* Total card */}
      <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'white' }}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ opacity: 0.6 }}>Total</div>
        <div className="text-2xl font-extrabold tabular-nums mb-3" style={{ letterSpacing: '-0.02em' }}>
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <div className="space-y-1 text-xs" style={{ opacity: 0.85 }}>
          <div className="flex justify-between">
            <span>{locale === 'es' ? 'Ya comprado' : 'Already bought'}</span>
            <span>${alreadyBought.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>{locale === 'es' ? 'Pendiente' : 'Remaining'}</span>
            <span>${remaining.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Linked jobs */}
      {job && (
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wp-text-3)' }}>
            {locale === 'es' ? 'Jobs vinculados' : 'Linked jobs'}
          </div>
          <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center justify-between text-xs py-1" style={{ color: 'var(--wp-text-2)' }}>
            <span className="font-medium" style={{ color: 'var(--wp-brand)' }}>{job.name}</span>
            <span>{items.length} items</span>
          </Link>
        </div>
      )}

      {/* Vendors summary */}
      {hasRealVendors && (
        <div className="card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wp-text-3)' }}>
            {locale === 'es' ? 'Proveedores' : 'Vendors'}
          </div>
          <div className="space-y-1">
            {vendorEntries.map(([vendor, vItems]) => (
              <div key={vendor} className="flex items-center justify-between text-xs">
                <span className="font-medium" style={{ color: 'var(--wp-text)' }}>{vendor}</span>
                <span style={{ color: 'var(--wp-text-3)' }}>
                  {vItems.length} · ${vItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI tip */}
      <div className="card p-4" style={{ background: 'var(--wp-surface-2)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--wp-brand)' }}>◆ WorkPilot AI</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--wp-text-2)' }}>
          {locale === 'es'
            ? 'Optimiza tu ruta de compras agrupando por proveedor. Ahorra tiempo y combustible.'
            : 'Optimize your shopping route by grouping by vendor. Save time and fuel.'}
        </p>
      </div>
    </>
  )
}
