'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, ChevronRight } from 'lucide-react'
import { createShoppingList } from '@/lib/actions/shopping-lists'
import { Segmented, KpiCard, EmptyState } from '@/components/ui'

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

  const initialTab: Tab = activeLists.length > 0 ? 'active'
    : draftLists.length > 0 ? 'drafts'
    : 'active'
  const [tab, setTab] = useState<Tab>(initialTab)

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

  const tabOptions = [
    { value: 'active' as Tab, label: locale === 'es' ? 'Activas' : 'Active', count: activeLists.length },
    { value: 'drafts' as Tab, label: t('drafts'), count: draftLists.length },
    { value: 'completed' as Tab, label: t('completedSection'), count: completedLists.length },
  ]

  const totalCost = lists.reduce((s, l) => s + l.totalCost, 0)
  const purchasedCost = lists.reduce((s, l) => s + l.purchasedCost, 0)
  const pendingCost = totalCost - purchasedCost

  return (
    <div className="px-4 pt-2 pb-4 md:p-8 min-h-full max-w-4xl">
      <div className="hidden md:flex items-end justify-between mb-5">
        <div>
          <h1 className="page-title mb-0">{t('title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--wp-text-2)' }}>
            {lists.length} {lists.length === 1 ? 'list' : 'lists'}
            {pendingCost > 0 && (
              <>{' · '}<span style={{ color: 'var(--wp-warning-v2)', fontWeight: 500 }}>${pendingCost.toLocaleString()}</span> pending</>
            )}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
          <Plus size={14} /> {t('newList')}
        </button>
      </div>

      {lists.length > 0 && (
        <div className="hidden md:grid grid-cols-3 gap-2.5 mb-5">
          <KpiCard
            tone="info"
            label="Active"
            value={activeLists.length}
            sub={activeLists.length > 0 ? 'Linked to jobs' : undefined}
          />
          <KpiCard
            tone="warning"
            label="Total pending"
            value={`$${pendingCost.toLocaleString()}`}
            sub={`$${purchasedCost.toLocaleString()} already bought`}
          />
          <KpiCard
            tone="success"
            label="Completed"
            value={completedLists.length}
            subTone={completedLists.length > 0 ? 'up' : 'neutral'}
          />
        </div>
      )}

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

      <div className="mb-4">
        <Segmented value={tab} onChange={setTab} options={tabOptions} />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart size={36} />}
          title={
            tab === 'active' ? (locale === 'es' ? 'Sin listas activas vinculadas a un job.' : 'No active lists linked to a job.')
            : tab === 'drafts' ? (locale === 'es' ? 'Sin borradores.' : 'No drafts.')
            : (locale === 'es' ? 'Sin listas completadas.' : 'No completed lists.')
          }
          cta={tab !== 'completed' ? (
            <button onClick={() => setShowNew(true)} className="btn-primary btn-sm">
              <Plus size={14} /> {t('newList')}
            </button>
          ) : undefined}
        />
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
    <Link
      href={`/${locale}/shopping-list/${list.id}`}
      className="card p-4 flex items-center gap-4 transition-all hover:border-[color:var(--wp-border-hover)]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--wp-text)' }}>{list.name}</p>
          <span
            className="text-xs shrink-0 ml-2 font-medium tabular-nums"
            style={{ color: isComplete ? 'var(--wp-success-v2)' : 'var(--wp-text-2)' }}
          >
            {list.purchasedItems}/{list.totalItems}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-surface-3)' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${pct}%`,
              background: isComplete ? 'var(--wp-success-v2)' : 'var(--wp-brand)',
            }} />
          </div>
          <span className="text-xs font-medium shrink-0 tabular-nums" style={{ color: 'var(--wp-text-3)' }}>
            ${list.purchasedCost.toLocaleString()} / ${list.totalCost.toLocaleString()}
          </span>
        </div>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--wp-text-3)' }} />
    </Link>
  )
}
