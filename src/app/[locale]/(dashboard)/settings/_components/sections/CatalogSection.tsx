'use client'

import { useState, useEffect, useTransition } from 'react'
import { Plus, Trash2, Pencil, Check, X, Search } from 'lucide-react'
import { getCatalogItems, createCatalogItem, deleteCatalogItem, updateCatalogItem } from '@/lib/actions/catalog'
import type { LineItemType } from '@/lib/adapters/db/types'
import { ConfirmModal } from '@/components/ConfirmModal'
import { SectionCard } from '../SectionCard'

type CatalogItem = {
  id: string; name: string; type: string
  unitPrice: string; category?: string | null
  description?: string | null; unit?: string | null
}

type SortKey = 'name' | 'type' | 'recent'

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  labor: { bg: 'var(--wp-info-bg-v2)', fg: 'var(--wp-info-v2)' },
  material: { bg: 'var(--wp-warning-bg-v2)', fg: 'var(--wp-warning-v2)' },
  subcontractor: { bg: 'rgba(139, 92, 246, 0.12)', fg: '#8B5CF6' },
  other: { bg: 'var(--wp-surface-3)', fg: 'var(--wp-text-2)' },
}

export function CatalogSection({ locale }: { locale: string }) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'labor' as LineItemType, unitPrice: '', description: '', category: '', unit: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; type: LineItemType; unitPrice: string; category: string; unit: string }>({
    name: '', type: 'labor', unitPrice: '', category: '', unit: '',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const es = locale === 'es'

  useEffect(() => {
    getCatalogItems().then(rows => setItems(rows as CatalogItem[])).catch(() => {})
  }, [])

  const filtered = items
    .filter(it => {
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        it.name.toLowerCase().includes(q) ||
        (it.category ?? '').toLowerCase().includes(q) ||
        it.type.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'type') return a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      return 0 // 'recent' = server order (desc by createdAt assumed)
    })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const item = await createCatalogItem(form)
      setItems(prev => [item as CatalogItem, ...prev])
      setForm({ name: '', type: 'labor', unitPrice: '', description: '', category: '', unit: '' })
      setShowAdd(false)
    })
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      type: item.type as LineItemType,
      unitPrice: item.unitPrice,
      category: item.category ?? '',
      unit: item.unit ?? '',
    })
  }

  function saveEdit() {
    if (!editingId) return
    startTransition(async () => {
      await updateCatalogItem(editingId, editForm)
      setItems(prev => prev.map(it => it.id === editingId ? { ...it, ...editForm } : it))
      setEditingId(null)
    })
  }

  function handleDelete() {
    if (!deleteId) return
    startTransition(async () => {
      await deleteCatalogItem(deleteId)
      setItems(prev => prev.filter(i => i.id !== deleteId))
      setDeleteId(null)
    })
  }

  return (
    <>
      {deleteId && (
        <ConfirmModal
          title={es ? 'Eliminar item' : 'Delete item'}
          message={es ? '¿Eliminar este item? No se puede deshacer.' : 'Delete this item? This cannot be undone.'}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
      <SectionCard
        title={es ? 'Catálogo de items' : 'Item catalog'}
        subtitle={es ? `${items.length} item${items.length === 1 ? '' : 's'} reusables en estimates` : `${items.length} reusable item${items.length === 1 ? '' : 's'} for estimates`}
        footer={
          <button
            type="button"
            onClick={() => setShowAdd(v => !v)}
            className="btn-primary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={13} /> {es ? 'Agregar item' : 'Add item'}
          </button>
        }
      >
        {/* Search + sort */}
        <div className="py-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--wp-text-3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={es ? 'Buscar por nombre, tipo o categoría' : 'Search by name, type or category'}
              className="input pl-7 text-sm w-full"
            />
          </div>
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="input text-sm"
          >
            <option value="name">{es ? 'Alfabético' : 'By name'}</option>
            <option value="type">{es ? 'Por tipo' : 'By type'}</option>
            <option value="recent">{es ? 'Recientes' : 'Recent'}</option>
          </select>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="py-3">
            <form onSubmit={handleAdd} className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--wp-surface-2)' }}>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={es ? 'Nombre' : 'Name'} className="input text-sm" required />
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as LineItemType }))} className="input text-sm">
                  <option value="labor">Labor</option>
                  <option value="material">Material</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(p => ({ ...p, unitPrice: e.target.value }))} placeholder={es ? 'Precio' : 'Price'} className="input text-sm" />
                <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder={es ? 'Unidad' : 'Unit'} className="input text-sm" />
                <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder={es ? 'Categoría' : 'Category'} className="input text-sm" />
              </div>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={es ? 'Descripción (opc.)' : 'Description (optional)'} className="input text-sm resize-none w-full" rows={2} />
              <div className="flex gap-2">
                <button type="submit" disabled={isPending} className="btn-primary btn-sm">{es ? 'Guardar' : 'Save'}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary btn-sm">{es ? 'Cancelar' : 'Cancel'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--wp-text-3)' }}>
            {query ? (es ? 'Ningún item coincide.' : 'No items match.') : (es ? 'Sin items aún. Agrega el primero.' : 'No catalog items yet. Add your first.')}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--wp-border-light)' }}>
            {filtered.map(item => {
              const c = TYPE_COLORS[item.type] ?? TYPE_COLORS.other
              const isEditing = editingId === item.id
              if (isEditing) {
                return (
                  <div key={item.id} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_120px_110px_90px_auto] gap-2 items-center">
                    <input className="input text-sm" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    <select className="input text-sm" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value as LineItemType }))}>
                      <option value="labor">Labor</option>
                      <option value="material">Material</option>
                      <option value="subcontractor">Subcontractor</option>
                      <option value="other">Other</option>
                    </select>
                    <input className="input text-sm" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} placeholder={es ? 'Categoría' : 'Category'} />
                    <input type="number" step="0.01" className="input text-sm text-right" value={editForm.unitPrice} onChange={e => setEditForm(f => ({ ...f, unitPrice: e.target.value }))} />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="btn-primary btn-sm px-2" aria-label="Save"><Check size={12} /></button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm px-2" aria-label="Cancel"><X size={12} /></button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--wp-text)' }}>{item.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize" style={{ background: c.bg, color: c.fg }}>
                        {item.type}
                      </span>
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)' }}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--wp-text-3)' }}>{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-mono tabular-nums shrink-0" style={{ color: 'var(--wp-text)' }}>
                    ${parseFloat(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {item.unit ? <span className="text-xs ml-0.5" style={{ color: 'var(--wp-text-3)' }}>/{item.unit}</span> : null}
                  </span>
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-md" style={{ color: 'var(--wp-text-3)' }} title={es ? 'Editar' : 'Edit'}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-md" style={{ color: 'var(--wp-text-3)' }} title={es ? 'Eliminar' : 'Delete'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </>
  )
}
