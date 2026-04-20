'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, Trash2, Save, X, CheckSquare, Square, RotateCcw } from 'lucide-react'
import { addShoppingListItem, markItemPurchased, unmarkItemPurchased, updateShoppingListItem, deleteShoppingListItem, bulkMarkItemsPurchased } from '@/lib/actions/shopping-lists'

export type Item = {
  id: string
  description: string
  quantity: string | null
  unit: string | null
  estimatedCost: string
  status: string
  purchasedAt: Date | null
  vendor?: string | null
  aisle?: string | null
}

export function ShoppingListItems({
  listId,
  jobId,
  items,
  setItems,
  onSpentChange,
  locale,
  onToast,
}: {
  listId: string
  jobId: string | null
  items: Item[]
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
  onSpentChange: (delta: number) => void
  locale: string
  onToast?: (msg: string, variant?: 'success' | 'error' | 'warning') => void
}) {
  const t = useTranslations('shoppingList')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ description: '', quantity: '', unit: '', estimatedCost: '', vendor: '', aisle: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newVendor, setNewVendor] = useState('')
  const [newAisle, setNewAisle] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const pendingItems = items.filter(it => it.status === 'pending')
  const purchasedItems = items.filter(it => it.status === 'purchased')

  // Group pending items by vendor
  const pendingByVendor = pendingItems.reduce<Record<string, Item[]>>((acc, it) => {
    const key = it.vendor || (locale === 'es' ? 'Sin proveedor' : 'No vendor')
    if (!acc[key]) acc[key] = []
    acc[key].push(it)
    return acc
  }, {})
  const vendorGroups = Object.entries(pendingByVendor)

  async function handleAddItem() {
    if (!newDesc.trim() || !newCost) return
    setSaving(true)
    try {
      const item = await addShoppingListItem(listId, {
        description: newDesc.trim(),
        estimatedCost: newCost,
        vendor: newVendor.trim() || undefined,
        aisle: newAisle.trim() || undefined,
      })
      setItems(prev => [...prev, { ...item, quantity: null, unit: null, purchasedAt: null } as Item])
      setNewDesc(''); setNewCost(''); setNewVendor(''); setNewAisle(''); setShowAdd(false)
      onToast?.(locale === 'es' ? 'Item agregado' : 'Item added')
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  async function handlePurchase(item: Item) {
    if (!jobId) return
    setSaving(true)
    try {
      await markItemPurchased(item.id, jobId, item.estimatedCost)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'purchased', purchasedAt: new Date() } : it))
      onSpentChange(parseFloat(item.estimatedCost))
      onToast?.(locale === 'es' ? 'Marcado como comprado' : 'Marked purchased')
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  async function handleUndoPurchase(item: Item) {
    setSaving(true)
    try {
      await unmarkItemPurchased(item.id)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'pending', purchasedAt: null } : it))
      onSpentChange(-parseFloat(item.estimatedCost))
      onToast?.(locale === 'es' ? 'Desmarcado' : 'Unmarked')
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  async function handleDeleteItem(item: Item) {
    if (!window.confirm(locale === 'es' ? '¿Eliminar este item?' : 'Delete this item?')) return
    setSaving(true)
    try {
      await deleteShoppingListItem(item.id)
      setItems(prev => prev.filter(it => it.id !== item.id))
      onToast?.(locale === 'es' ? 'Item eliminado' : 'Item deleted')
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditForm({
      description: item.description,
      quantity: item.quantity ?? '',
      unit: item.unit ?? '',
      estimatedCost: item.estimatedCost,
      vendor: item.vendor ?? '',
      aisle: item.aisle ?? '',
    })
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    try {
      await updateShoppingListItem(editingId, editForm)
      setItems(prev => prev.map(it => it.id === editingId ? {
        ...it,
        description: editForm.description,
        quantity: editForm.quantity || null,
        unit: editForm.unit || null,
        estimatedCost: editForm.estimatedCost,
        vendor: editForm.vendor || null,
        aisle: editForm.aisle || null,
      } : it))
      setEditingId(null)
      onToast?.(locale === 'es' ? 'Item actualizado' : 'Item updated')
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleBulkPurchase() {
    if (!jobId || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setSaving(true)
    try {
      await bulkMarkItemsPurchased(ids, jobId)
      const purchased = items.filter(it => ids.includes(it.id) && it.status === 'pending')
      const amount = purchased.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
      setItems(prev => prev.map(it => ids.includes(it.id) && it.status === 'pending' ? { ...it, status: 'purchased', purchasedAt: new Date() } : it))
      onSpentChange(amount)
      setSelectedIds(new Set()); setSelectMode(false)
      onToast?.(locale === 'es' ? `${purchased.length} items comprados` : `${purchased.length} items purchased`)
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4" style={{ opacity: saving ? 0.7 : 1 }}>
      {/* Bulk actions bar — only when selecting */}
      {selectMode && (
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }} className="btn-secondary btn-sm text-xs">
            <X size={12} /> {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkPurchase} className="btn-primary btn-sm text-xs">
              {locale === 'es' ? `Marcar ${selectedIds.size} compradas` : `Mark ${selectedIds.size} bought`}
            </button>
          )}
        </div>
      )}

      {/* Pending items — grouped by vendor */}
      {vendorGroups.map(([vendor, vItems]) => {
        const vTotal = vItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
        const hasRealVendor = vendor !== 'Sin proveedor' && vendor !== 'No vendor'
        return (
          <div key={vendor} className="card overflow-hidden">
            {/* Vendor header */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{hasRealVendor ? '🏬' : '📦'}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>{vendor}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-info-bg-v2)', color: 'var(--wp-info-v2)' }}>
                  ● {vItems.length} {locale === 'es' ? 'ítems' : 'items'}
                </span>
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--wp-text-3)' }}>
                ~${vTotal.toLocaleString('en-US')}
              </span>
            </div>
            {/* Items */}
            {vItems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}>
                {editingId === item.id ? (
                  <div className="flex-1 grid grid-cols-[1fr_120px_80px_90px_auto] gap-2 items-center">
                    <input className="input text-sm" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                    <input className="input text-sm" placeholder={locale === 'es' ? 'Proveedor' : 'Vendor'} value={editForm.vendor} onChange={e => setEditForm(f => ({ ...f, vendor: e.target.value }))} />
                    <input className="input text-sm" placeholder="Aisle" value={editForm.aisle} onChange={e => setEditForm(f => ({ ...f, aisle: e.target.value }))} />
                    <input type="number" className="input text-sm font-mono" value={editForm.estimatedCost} onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))} />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="btn-primary btn-sm text-xs" aria-label="Save"><Save size={12} /></button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm text-xs" aria-label="Cancel"><X size={12} /></button>
                    </div>
                  </div>
                ) : selectMode ? (
                  <button onClick={() => toggleSelect(item.id)} className="flex-1 flex items-center gap-3 text-left">
                    {selectedIds.has(item.id) ? <CheckSquare size={18} style={{ color: 'var(--wp-brand)' }} /> : <Square size={18} style={{ color: 'var(--wp-border-v2)' }} />}
                    <ItemRow item={item} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => jobId && handlePurchase(item)} disabled={!jobId} className="shrink-0">
                      <Square size={18} style={{ color: 'var(--wp-border-v2)' }} />
                    </button>
                    <ItemRow item={item} />
                    <button onClick={() => startEdit(item)} className="shrink-0 p-1 text-[var(--wp-text-3)] hover:text-[var(--wp-text)]"><Pencil size={13} /></button>
                    <button onClick={() => handleDeleteItem(item)} className="shrink-0 p-1 text-[var(--wp-text-3)] hover:text-[var(--wp-error-v2)]"><Trash2 size={13} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Add item */}
      {showAdd ? (
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <input className="flex-1 min-w-[140px] input text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={locale === 'es' ? 'Descripción' : 'Description'} autoFocus />
          <input className="w-32 input text-sm" value={newVendor} onChange={e => setNewVendor(e.target.value)} placeholder={locale === 'es' ? 'Proveedor' : 'Vendor'} />
          <input className="w-24 input text-sm" value={newAisle} onChange={e => setNewAisle(e.target.value)} placeholder="Aisle" />
          <input type="number" className="w-24 input text-sm font-mono" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="$" min="0" step="0.01" />
          <button onClick={handleAddItem} disabled={saving || !newDesc.trim() || !newCost} className="btn-primary btn-sm text-xs">Add</button>
          <button onClick={() => { setShowAdd(false); setNewDesc(''); setNewCost(''); setNewVendor(''); setNewAisle('') }} className="btn-secondary btn-sm text-xs">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors" style={{ color: 'var(--wp-text-3)', border: '1px dashed var(--wp-border-v2)' }}>
          + {t('addItem')}
        </button>
      )}

      {/* Purchased items */}
      {purchasedItems.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">✓</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>{locale === 'es' ? 'Comprados' : 'Purchased'}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                ● {purchasedItems.length} items
              </span>
            </div>
            <span className="text-xs tabular-nums" style={{ color: 'var(--wp-text-3)' }}>
              ${purchasedItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString('en-US')}
            </span>
          </div>
          {purchasedItems.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}>
              <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold" style={{ background: 'var(--wp-success-v2)' }}>✓</div>
              <span className="flex-1 text-sm line-through" style={{ color: 'var(--wp-text-3)' }}>{item.description}</span>
              <span className="text-sm font-mono shrink-0" style={{ color: 'var(--wp-text-3)' }}>${parseFloat(item.estimatedCost).toLocaleString('en-US')}</span>
              <button onClick={() => handleUndoPurchase(item)} className="shrink-0 p-1 text-[var(--wp-text-3)]" title="Undo"><RotateCcw size={13} /></button>
              <button onClick={() => handleDeleteItem(item)} className="shrink-0 p-1 text-[var(--wp-text-3)] hover:text-[var(--wp-error-v2)]"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item }: { item: Item }) {
  return (
    <div className="flex-1 min-w-0">
      <span className="text-sm" style={{ color: 'var(--wp-text)' }}>
        {item.description}
        {item.quantity && (
          <span className="text-xs ml-1" style={{ color: 'var(--wp-text-3)' }}>
            · {parseFloat(item.quantity).toLocaleString('en-US')}{item.unit ? ` ${item.unit}` : '×'}
          </span>
        )}
      </span>
      {(item.aisle || item.vendor) && (
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
          {item.aisle && <span>{item.aisle}</span>}
          {item.aisle && item.vendor && <span> · </span>}
          {item.vendor && <span>{item.vendor}</span>}
        </div>
      )}
    </div>
  )
}
