'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react'
import { createShoppingList } from '@/lib/actions/shopping-lists'

type ListWithStats = {
  id: string; name: string; jobId: string | null; status: string
  totalItems: number; purchasedItems: number; totalCost: number; purchasedCost: number
}

type Tab = 'active' | 'drafts' | 'completed'

export function ShoppingListsClient({ lists }: { lists: ListWithStats[] }) {
  const locale = useLocale()
  const t = useTranslations('shoppingList')
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const draftLists = lists.filter(l => !l.jobId && l.status !== 'completed')
  const activeLists = lists.filter(l => l.status === 'active' && l.jobId)
  const completedLists = lists.filter(l => l.status === 'completed')

  // Default to whichever bucket has content; prefer Active.
  const initialTab: Tab = activeLists.length > 0 ? 'active'
    : draftLists.length > 0 ? 'drafts'
    : 'active'
  const [tab, setTab] = useState<Tab>(initialTab)

  // Mobile create button lives in DashboardShell — it dispatches this event.
  useEffect(() => {
    function open() { setShowNew(true) }
    window.addEventListener('shopping-list:new', open)
    return () => window.removeEventListener('shopping-list:new', open)
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const list = await createShoppingList({ name: newName.trim() })
    setNewName('')
    setShowNew(false)
    setCreating(false)
    router.push(`/${locale}/shopping-list/${list.id}`)
  }

  const visible = tab === 'active' ? activeLists : tab === 'drafts' ? draftLists : completedLists
  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: locale === 'es' ? 'Activas' : 'Active', count: activeLists.length },
    { key: 'drafts', label: t('drafts'), count: draftLists.length },
    { key: 'completed', label: t('completedSection'), count: completedLists.length },
  ]

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 min-h-full max-w-3xl">
      <div className="hidden md:flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">{t('title')}</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
          <Plus size={14} /> {t('newList')}
        </button>
      </div>

      {/* New list form */}
      {showNew && (
        <div className="card p-4 mb-4">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="input flex-1 text-sm"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary text-sm">
              {creating ? '...' : t('create')}
            </button>
            <button onClick={() => { setShowNew(false); setNewName('') }} className="btn-secondary text-sm">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Tabs by status */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto" role="tablist">
        {TABS.map(it => {
          const isActive = tab === it.key
          return (
            <button
              key={it.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(it.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: isActive ? 'var(--wp-primary)' : 'var(--wp-bg-muted)',
                color: isActive ? 'white' : 'var(--wp-text-secondary)',
              }}
            >
              {it.label}
              <span
                className="ml-1.5 inline-flex items-center justify-center text-[10px] font-semibold rounded-full px-1.5"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--wp-bg-primary)',
                  color: isActive ? 'white' : 'var(--wp-text-muted)',
                  minWidth: 18,
                }}
              >
                {it.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Visible bucket */}
      {visible.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCart size={36} className="mx-auto mb-3" style={{ color: 'var(--wp-border)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--wp-text-muted)' }}>
            {tab === 'active' && (locale === 'es' ? 'Sin listas activas vinculadas a un job.' : 'No active lists linked to a job.')}
            {tab === 'drafts' && (locale === 'es' ? 'Sin borradores.' : 'No drafts.')}
            {tab === 'completed' && (locale === 'es' ? 'Sin listas completadas.' : 'No completed lists.')}
          </p>
          {tab !== 'completed' && (
            <button onClick={() => setShowNew(true)} className="btn-primary btn-sm inline-flex items-center gap-2">
              <Plus size={14} /> {t('newList')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(list => (
            <ListCard key={list.id} list={list} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListCard({ list, locale }: { list: ListWithStats; locale: string }) {
  const pct = list.totalItems > 0 ? (list.purchasedItems / list.totalItems) * 100 : 0
  const isComplete = list.purchasedItems === list.totalItems && list.totalItems > 0

  return (
    <Link href={`/${locale}/shopping-list/${list.id}`}
      className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--wp-text-primary)' }}>{list.name}</p>
          <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--wp-text-muted)' }}>
            {list.purchasedItems}/{list.totalItems}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${pct}%`,
              background: isComplete ? 'var(--wp-success)' : 'var(--wp-primary)',
            }} />
          </div>
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--wp-text-muted)' }}>
            ${list.purchasedCost.toLocaleString()} / ${list.totalCost.toLocaleString()}
          </span>
        </div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--wp-border)' }} />
    </Link>
  )
}
