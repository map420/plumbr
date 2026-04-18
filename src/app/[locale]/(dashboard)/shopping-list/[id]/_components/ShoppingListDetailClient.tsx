'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { ChevronLeft, Copy, Check, Printer } from 'lucide-react'
import { ShoppingListSidebar } from './ShoppingListSidebar'
import { ShoppingListItems, type Item } from './ShoppingListItems'

type List = { id: string; name: string; jobId: string | null; status: string; shareToken: string | null; items: Item[] }
type JobSummary = { id: string; name: string; clientName: string; status: string }
type EstimateSummary = { id: string; number: string }

export function ShoppingListDetailClient({ list, job: initialJob, materialSpent: initialSpent }: {
  list: List
  job: JobSummary | null
  estimate: EstimateSummary | null
  materialBudget: number
  materialSpent: number
}) {
  const router = useRouter()
  const locale = useLocale()
  const [items, setItems] = useState(list.items)
  const [materialSpent, setMaterialSpent] = useState(initialSpent)
  const [copied, setCopied] = useState(false)
  const [job] = useState<JobSummary | null>(initialJob)

  const pendingItems = items.filter(it => it.status === 'pending')
  const total = items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
  const vendorCount = (() => {
    const set = new Set<string>()
    items.forEach(it => { if (it.vendor) set.add(it.vendor) })
    return set.size
  })()

  async function handleShare() {
    const text = `${list.name}\n\n${items.map(it => `${it.status === 'purchased' ? '✓' : '○'} ${it.description} — $${parseFloat(it.estimatedCost).toLocaleString()}`).join('\n')}\n\nTotal: $${total.toLocaleString()}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button onClick={() => router.push(`/${locale}/shopping-list`)} className="flex items-center gap-0.5 text-sm font-medium" style={{ color: 'var(--wp-brand)' }}>
            <ChevronLeft size={16} /> {locale === 'es' ? 'Listas' : 'Lists'}
          </button>
        </div>
        <span className="flex-shrink-0 text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--wp-text)' }}>{list.name}</span>
        <div className="flex-1 flex items-center justify-end">
          <button onClick={handleShare} style={{ color: 'var(--wp-brand)' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Desktop header */}
        <div className="hidden md:flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--wp-text)' }}>{list.name}</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--wp-text-3)' }}>
              {locale === 'es'
                ? `${job ? '1 job' : '0 jobs'} · $${total.toLocaleString()} estimado · ${vendorCount} proveedor${vendorCount !== 1 ? 'es' : ''}`
                : `${job ? '1 job' : '0 jobs'} · $${total.toLocaleString()} estimated · ${vendorCount} vendor${vendorCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/shopping-list/${list.id}/print`} className="btn-secondary btn-sm">
              <Printer size={13} /> Print / PDF
            </Link>
            <button onClick={handleShare} className="btn-secondary btn-sm">
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Share with team</>}
            </button>
            {pendingItems.length > 0 && (
              <button className="btn-primary btn-sm">
                <Check size={13} /> Mark all bought
              </button>
            )}
          </div>
        </div>

        {/* ═══ DESKTOP 2-COLUMN LAYOUT ═══ */}
        <div
          className="sl-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 260px',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Main column — items */}
          <div style={{ minWidth: 0 }}>
            <ShoppingListItems
              listId={list.id}
              jobId={list.jobId}
              items={items}
              setItems={setItems}
              onSpentChange={(delta) => setMaterialSpent(prev => Math.max(0, prev + delta))}
              locale={locale}
            />
          </div>

          {/* Sidebar column */}
          <aside className="sl-side-col space-y-4" style={{ position: 'sticky', top: 16 }}>
            <ShoppingListSidebar items={items} job={job} locale={locale} />
          </aside>
        </div>
      </div>
    </>
  )
}
