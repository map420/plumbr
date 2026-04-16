'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, ChevronRight, ChevronDown } from 'lucide-react'
import { createShoppingList } from '@/lib/actions/shopping-lists'

type ListWithStats = {
  id: string; name: string; jobId: string | null; status: string
  totalItems: number; purchasedItems: number; totalCost: number; purchasedCost: number
}

export function ShoppingListsClient({ lists }: { lists: ListWithStats[] }) {
  const locale = useLocale()
  const t = useTranslations('shoppingList')
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)

  const activeLists = lists.filter(l => l.status === 'active' && l.jobId)
  const draftLists = lists.filter(l => !l.jobId)
  const completedLists = lists.filter(l => l.status === 'completed')

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const list = await createShoppingList({ name: newName.trim() })
    setNewName('')
    setShowNew(false)
    setCreating(false)
    router.push(`/${locale}/shopping-list/${list.id}`)
  }

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

      {/* Active lists */}
      {activeLists.length === 0 && draftLists.length === 0 && completedLists.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCart size={36} className="mx-auto mb-3" style={{ color: 'var(--wp-border)' }} />
          <p className="text-sm mb-4" style={{ color: 'var(--wp-text-muted)' }}>{t('empty')}</p>
          <button onClick={() => setShowNew(true)} className="btn-primary btn-sm inline-flex items-center gap-2">
            <Plus size={14} /> {t('newList')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {activeLists.map(list => (
            <ListCard key={list.id} list={list} locale={locale} />
          ))}
        </div>
      )}

      {/* Drafts (no job) — collapsible */}
      {draftLists.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowDrafts(!showDrafts)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2"
            style={{ color: 'var(--wp-text-muted)' }}>
            {t('drafts')} ({draftLists.length})
            <ChevronDown size={12} style={{ transform: showDrafts ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showDrafts && (
            <div className="space-y-2">
              {draftLists.map(list => (
                <ListCard key={list.id} list={list} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {completedLists.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-muted)' }}>
            {t('completedSection')} ({completedLists.length})
          </p>
          <div className="space-y-2">
            {completedLists.map(list => (
              <ListCard key={list.id} list={list} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button onClick={() => setShowNew(true)}
        className="md:hidden fixed bottom-20 right-4 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg z-10"
        style={{ background: 'var(--wp-accent)' }}>
        <Plus size={22} />
      </button>
    </div>
  )
}

function ListCard({ list, locale }: { list: any; locale: string }) {
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
