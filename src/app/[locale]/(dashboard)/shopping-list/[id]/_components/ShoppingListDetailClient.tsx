'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronLeft, Copy, Check, Briefcase, MoreHorizontal, ExternalLink, Unlink, RotateCcw, Pencil, Trash2, Printer, Save, X, CheckSquare, Square } from 'lucide-react'
import { addShoppingListItem, markItemPurchased, unmarkItemPurchased, updateShoppingListJob, updateShoppingListItem, deleteShoppingListItem, bulkMarkItemsPurchased } from '@/lib/actions/shopping-lists'
import { JobPicker, type JobPickerOption } from '@/components/JobPicker'

type Item = { id: string; description: string; quantity: string | null; unit: string | null; estimatedCost: string; status: string; purchasedAt: Date | null; vendor?: string | null; aisle?: string | null }
type List = { id: string; name: string; jobId: string | null; status: string; shareToken: string | null; items: Item[] }
type JobSummary = { id: string; name: string; clientName: string; status: string }
type EstimateSummary = { id: string; number: string }

export function ShoppingListDetailClient({ list, job: initialJob, estimate, materialBudget, materialSpent: initialSpent }: {
  list: List
  job: JobSummary | null
  estimate: EstimateSummary | null
  materialBudget: number
  materialSpent: number
}) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('shoppingList')
  const [items, setItems] = useState(list.items)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')
  const [newVendor, setNewVendor] = useState('')
  const [newAisle, setNewAisle] = useState('')
  const [materialSpent, setMaterialSpent] = useState(initialSpent)
  const [copied, setCopied] = useState(false)
  const [job, setJob] = useState<JobSummary | null>(initialJob)
  const [jobMenuOpen, setJobMenuOpen] = useState(false)
  const [showJobPicker, setShowJobPicker] = useState(false)
  const [newJobPick, setNewJobPick] = useState<JobPickerOption | null>(null)

  async function handleChangeJob() {
    if (!newJobPick) return
    setSaving(true)
    try {
      await updateShoppingListJob(list.id, newJobPick.id)
      setJob({ id: newJobPick.id, name: newJobPick.name, clientName: newJobPick.clientName, status: newJobPick.status })
      setShowJobPicker(false)
      setNewJobPick(null)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlinkJob() {
    setSaving(true)
    try {
      await updateShoppingListJob(list.id, null)
      setJob(null)
      setJobMenuOpen(false)
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const pendingItems = items.filter(it => it.status === 'pending')
  const purchasedItems = items.filter(it => it.status === 'purchased')
  const pendingTotal = pendingItems.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)

  // Group pending items by vendor (null vendor → "Sin proveedor"/"No vendor")
  const pendingByVendor = pendingItems.reduce<Record<string, Item[]>>((acc, it) => {
    const key = it.vendor || (locale === 'es' ? 'Sin proveedor' : 'No vendor')
    if (!acc[key]) acc[key] = []
    acc[key].push(it)
    return acc
  }, {})
  const vendorGroups = Object.entries(pendingByVendor)
  const uniqueVendors = vendorGroups.map(([v]) => v).filter(v => v !== 'Sin proveedor' && v !== 'No vendor')
  const uniqueJobsCount = job ? 1 : 0 // List currently linked to one job; future: multi-job support

  async function handlePurchase(item: Item) {
    if (!list.jobId) return
    const amount = editAmount || item.estimatedCost
    const description = editDesc || item.description
    setSaving(true)
    try {
      await markItemPurchased(item.id, list.jobId, amount)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'purchased', purchasedAt: new Date(), description: editDesc || it.description } : it))
      setMaterialSpent(prev => prev + parseFloat(amount))
      setConfirming(null)
      setEditAmount('')
      setEditDesc('')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddItem() {
    if (!newDesc.trim() || !newCost) return
    setSaving(true)
    try {
      const item = await addShoppingListItem(list.id, {
        description: newDesc.trim(),
        estimatedCost: newCost,
        vendor: newVendor.trim() || undefined,
        aisle: newAisle.trim() || undefined,
      })
      setItems(prev => [...prev, { ...item, quantity: null, unit: null, purchasedAt: null } as any])
      setNewDesc('')
      setNewCost('')
      setNewVendor('')
      setNewAisle('')
      setShowAdd(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUndoPurchase(item: Item) {
    setSaving(true)
    try {
      await unmarkItemPurchased(item.id)
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'pending', purchasedAt: null } : it))
      // Subtract the amount we previously added when marking purchased.
      setMaterialSpent(prev => Math.max(prev - parseFloat(item.estimatedCost), 0))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit pending items ───────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ description: '', quantity: '', unit: '', estimatedCost: '' })

  function startEdit(item: Item) {
    setConfirming(null) // close purchase form if open on same row
    setEditingId(item.id)
    setEditForm({
      description: item.description,
      quantity: item.quantity ?? '',
      unit: item.unit ?? '',
      estimatedCost: item.estimatedCost,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    try {
      await updateShoppingListItem(editingId, {
        description: editForm.description,
        quantity: editForm.quantity || undefined,
        unit: editForm.unit || undefined,
        estimatedCost: editForm.estimatedCost,
      })
      setItems(prev => prev.map(it => it.id === editingId ? {
        ...it,
        description: editForm.description,
        quantity: editForm.quantity || null,
        unit: editForm.unit || null,
        estimatedCost: editForm.estimatedCost,
      } : it))
      setEditingId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(item: Item) {
    const msg = item.status === 'purchased'
      ? 'Delete this item? The linked expense will remain on the job.'
      : 'Delete this item?'
    if (!window.confirm(msg)) return
    setSaving(true)
    try {
      await deleteShoppingListItem(item.id)
      setItems(prev => prev.filter(it => it.id !== item.id))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // ── Bulk selection ──────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelectMode() {
    if (selectMode) setSelectedIds(new Set())
    setSelectMode(prev => !prev)
    setConfirming(null)
    setEditingId(null)
  }

  function toggleSelect(itemId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function selectAllPending() {
    setSelectedIds(new Set(items.filter(it => it.status === 'pending').map(it => it.id)))
  }

  async function handleBulkPurchase() {
    if (!list.jobId || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setSaving(true)
    try {
      const result = await bulkMarkItemsPurchased(ids, list.jobId)
      // Optimistic update for items that succeeded — refresh from server for source of truth.
      const purchasedAmount = items
        .filter(it => ids.includes(it.id) && it.status === 'pending')
        .reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
      setItems(prev => prev.map(it => ids.includes(it.id) && it.status === 'pending'
        ? { ...it, status: 'purchased', purchasedAt: new Date() }
        : it
      ))
      setMaterialSpent(prev => prev + purchasedAmount)
      setSelectedIds(new Set())
      setSelectMode(false)
      router.refresh()
      if (result.failed > 0) {
        window.alert(`Marked ${result.marked}, skipped ${result.skipped}, failed ${result.failed}.`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    // Generate text version
    const text = `${list.name}\n\n${items.map(it => `${it.status === 'purchased' ? '✓' : '○'} ${it.description} — $${parseFloat(it.estimatedCost).toLocaleString()}`).join('\n')}\n\nTotal: $${items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const budgetPct = materialBudget > 0 ? Math.min((materialSpent / materialBudget) * 100, 100) : 0
  const isOverBudget = materialSpent > materialBudget && materialBudget > 0

  return (
    <div>
      {/* Mobile header */}
      <div className="flex items-center px-4 py-2.5 md:hidden" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button onClick={() => router.push(`/${locale}/shopping-list`)}
            className="flex items-center gap-0.5"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <ChevronLeft size={16} /> {t('backToLists')}
          </button>
        </div>
        <span className="flex-shrink-0 text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>{list.name}</span>
        <div className="flex-1 flex items-center justify-end">
          <button onClick={handleShare} style={{ color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden md:flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--wp-text)' }}>{list.name}</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--wp-text-3)' }}>
              {locale === 'es'
                ? `Materiales de ${uniqueJobsCount} job${uniqueJobsCount !== 1 ? 's' : ''} · $${items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString()} estimado · ${vendorGroups.length} proveedor${vendorGroups.length !== 1 ? 'es' : ''}`
                : `${uniqueJobsCount} job${uniqueJobsCount !== 1 ? 's' : ''} · $${items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString()} estimated · ${vendorGroups.length} vendor${vendorGroups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/shopping-list/${list.id}/print`} className="btn-secondary btn-sm">
              <Printer size={13} /> Print / PDF
            </Link>
            <button onClick={handleShare} className="btn-secondary btn-sm">
              {copied ? <><Check size={13} /> {t('copied')}</> : <><Copy size={13} /> Share with team</>}
            </button>
            {pendingItems.length > 0 && (
              <button className="btn-primary btn-sm">
                <Check size={13} /> Mark all bought
              </button>
            )}
          </div>
        </div>

        {/* 2-column layout: items left + sidebar right */}
        <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="space-y-4 flex-1 min-w-0 w-full">

        {/* Job link — compact row, not a big card (job info is in sidebar) */}
        {!job && (
          <div className="card p-3 flex items-center gap-3">
            <Briefcase size={14} style={{ color: 'var(--wp-text-3)' }} />
            <span className="flex-1 text-xs" style={{ color: 'var(--wp-text-3)' }}>{t('noJobHelp')}</span>
            <button onClick={() => setShowJobPicker(true)} className="btn-secondary btn-sm text-xs">{t('link')}</button>
          </div>
        )}

        {/* Job picker modal */}
        {showJobPicker && (
          <div className="card p-4 flex flex-col gap-3" style={{ border: '1px solid var(--wp-primary)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--wp-text-primary)' }}>
              {job ? t('changeJob') : t('linkToJob')}
            </div>
            <JobPicker value={newJobPick} onChange={setNewJobPick} placeholder={t('selectJobPlaceholder')} allowNone={false} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowJobPicker(false); setNewJobPick(null) }} className="btn-secondary btn-sm">{t('cancel')}</button>
              <button onClick={handleChangeJob} disabled={saving || !newJobPick} className="btn-primary btn-sm">
                {saving ? '...' : (job ? t('change') : t('link'))}
              </button>
            </div>
          </div>
        )}

        {/* Pending items — vendor group styled header */}
        {pendingItems.length > 0 && (
          <div className="card overflow-hidden">
            {/* Vendor group header */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🏬</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>
                  {locale === 'es' ? 'Items pendientes' : 'Pending items'}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-info-bg-v2)', color: 'var(--wp-info-v2)' }}>
                  ● {pendingItems.length} items
                </span>
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--wp-text-3)' }}>
                ~${pendingItems.reduce((s: number, it: any) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}
              </span>
            </div>
            {pendingItems.map((item, i) => {
              const isActive = confirming === item.id
              const isEditing = editingId === item.id
              return (
                <div key={item.id} style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}>
                  {/* Edit form takes over the row when editing */}
                  {isEditing ? (
                    <div className="px-4 py-3 space-y-2" style={{ background: 'var(--wp-bg-secondary)' }}>
                      <input
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full px-2 py-1.5 rounded text-sm border"
                        style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                        placeholder={t('descriptionPlaceholder')}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.quantity}
                          onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                          className="w-20 px-2 py-1 rounded text-xs font-mono border"
                          style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                          placeholder="Qty"
                        />
                        <input
                          value={editForm.unit}
                          onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                          className="w-24 px-2 py-1 rounded text-xs border"
                          style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                          placeholder="Unit (e.g. m²)"
                        />
                        <input
                          type="number" min="0" step="0.01"
                          value={editForm.estimatedCost}
                          onChange={e => setEditForm(f => ({ ...f, estimatedCost: e.target.value }))}
                          className="flex-1 min-w-[80px] px-2 py-1 rounded text-xs font-mono border"
                          style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                          placeholder="$ Cost"
                        />
                        <button
                          onClick={saveEdit}
                          disabled={saving || !editForm.description.trim() || !editForm.estimatedCost}
                          className="px-3 py-1 rounded text-xs font-medium text-white flex items-center gap-1 disabled:opacity-50"
                          style={{ background: 'var(--wp-primary)' }}
                        >
                          <Save size={12} /> {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs flex items-center gap-1"
                          style={{ color: 'var(--wp-text-muted)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3">
                        {selectMode ? (
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="flex-1 flex items-center gap-3 text-left cursor-pointer"
                          >
                            {selectedIds.has(item.id)
                              ? <CheckSquare size={20} style={{ color: 'var(--wp-primary)' }} className="shrink-0" />
                              : <Square size={20} style={{ color: 'var(--wp-border)' }} className="shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>
                                {item.description}
                                {item.quantity && (
                                  <span className="text-xs ml-1" style={{ color: 'var(--wp-text-muted)' }}>
                                    × {parseFloat(item.quantity).toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
                                  </span>
                                )}
                              </span>
                              {(item.vendor || item.aisle) && (
                                <div className="text-[10px] mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
                                  {item.aisle && <span>{item.aisle}</span>}
                                  {item.aisle && item.vendor && <span> · </span>}
                                  {item.vendor && <span>{item.vendor}</span>}
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-mono font-medium shrink-0" style={{ color: 'var(--wp-text-primary)' }}>
                              ${parseFloat(item.estimatedCost).toLocaleString()}
                            </span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { setConfirming(isActive ? null : item.id); setEditAmount(''); setEditDesc('') }}
                              className="flex-1 flex items-center gap-3 text-left cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded border-2 shrink-0" style={{ borderColor: 'var(--wp-border)' }} />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm" style={{ color: 'var(--wp-text-primary)' }}>
                                  {item.description}
                                  {item.quantity && (
                                    <span className="text-xs ml-1" style={{ color: 'var(--wp-text-muted)' }}>
                                      × {parseFloat(item.quantity).toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
                                    </span>
                                  )}
                                </span>
                                {(item.vendor || item.aisle) && (
                                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--wp-text-3)' }}>
                                    {item.aisle && <span>{item.aisle}</span>}
                                    {item.aisle && item.vendor && <span> · </span>}
                                    {item.vendor && <span>{item.vendor}</span>}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-mono font-medium shrink-0" style={{ color: 'var(--wp-text-primary)' }}>
                                ${parseFloat(item.estimatedCost).toLocaleString()}
                              </span>
                            </button>
                            <button
                              onClick={() => startEdit(item)}
                              disabled={saving}
                              className="shrink-0 p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                              style={{ color: 'var(--wp-text-muted)' }}
                              title="Edit item"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              disabled={saving}
                              className="shrink-0 p-1 rounded hover:bg-red-50 disabled:opacity-40"
                              style={{ color: 'var(--wp-error)' }}
                              title="Delete item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                      {isActive && list.jobId && (
                        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
                          <input
                            className="flex-1 min-w-[120px] px-2 py-1 rounded text-sm border"
                            style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                            value={editDesc || item.description}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder={t('descriptionPlaceholder')}
                          />
                          <input
                            type="number" min="0" step="0.01"
                            className="w-20 px-2 py-1 rounded text-sm font-mono border"
                            style={{ borderColor: 'var(--wp-border)', color: 'var(--wp-text-primary)', background: 'var(--wp-bg-primary)' }}
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            placeholder={item.estimatedCost}
                          />
                          <button onClick={() => handlePurchase(item)} disabled={saving}
                            className="px-3 py-1 rounded text-xs font-medium text-white"
                            style={{ background: 'var(--wp-primary)' }}>
                            {saving ? '...' : t('markPurchased')}
                          </button>
                          <button onClick={() => setConfirming(null)}
                            className="px-2 py-1 text-xs" style={{ color: 'var(--wp-text-muted)' }}>
                            ×
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add item */}
        {showAdd ? (
          <div className="card p-4 flex items-center gap-2 flex-wrap">
            <input className="flex-1 min-w-[140px] input text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder={t('descriptionPlaceholder')} autoFocus />
            <input className="w-32 input text-sm" value={newVendor} onChange={e => setNewVendor(e.target.value)}
              placeholder={locale === 'es' ? 'Proveedor' : 'Vendor'} />
            <input className="w-24 input text-sm" value={newAisle} onChange={e => setNewAisle(e.target.value)}
              placeholder={locale === 'es' ? 'Pasillo' : 'Aisle'} />
            <input type="number" className="w-24 input text-sm font-mono" value={newCost} onChange={e => setNewCost(e.target.value)}
              placeholder={t('costPlaceholder')} min="0" step="0.01" />
            <button onClick={handleAddItem} disabled={saving || !newDesc.trim() || !newCost} className="btn-primary text-xs">{t('add')}</button>
            <button onClick={() => { setShowAdd(false); setNewDesc(''); setNewCost(''); setNewVendor(''); setNewAisle('') }} className="btn-secondary text-xs">{t('cancel')}</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--wp-text-muted)', border: '1px dashed var(--wp-border)' }}>
            + {t('addItem')}
          </button>
        )}

        {/* Purchased items — vendor group styled header */}
        {purchasedItems.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--wp-surface-2)', borderBottom: '1px solid var(--wp-border-v2)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm">✓</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--wp-text)' }}>
                  {t('purchasedHeading')}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)' }}>
                  ● {purchasedItems.length} items
                </span>
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--wp-text-3)' }}>
                ${purchasedItems.reduce((s: number, it: any) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}
              </span>
            </div>
            <div>
              {purchasedItems.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5"
                  style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}>
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                    style={{ background: 'var(--wp-success)' }}>✓</div>
                  <span className="flex-1 text-sm line-through" style={{ color: 'var(--wp-text-muted)' }}>{item.description}</span>
                  <span className="text-sm font-mono shrink-0" style={{ color: 'var(--wp-text-muted)' }}>
                    ${parseFloat(item.estimatedCost).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleUndoPurchase(item)}
                    disabled={saving}
                    className="shrink-0 p-1 rounded hover:bg-slate-100 disabled:opacity-40"
                    style={{ color: 'var(--wp-text-muted)' }}
                    title="Undo — revert to pending and delete the linked expense"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    disabled={saving}
                    className="shrink-0 p-1 rounded hover:bg-red-50 disabled:opacity-40"
                    style={{ color: 'var(--wp-error)' }}
                    title="Delete item (keeps the expense on the job)"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

        </div>{/* end left column */}

        {/* ── RIGHT SIDEBAR ── */}
        <div className="hidden md:block sticky top-4 space-y-4 shrink-0" style={{ width: 280 }}>
          {/* Total card */}
          <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'white' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ opacity: 0.6 }}>Total</div>
            <div className="text-2xl font-extrabold tabular-nums mb-3" style={{ letterSpacing: '-0.02em' }}>
              ${items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="space-y-1 text-xs" style={{ opacity: 0.85 }}>
              <div className="flex justify-between">
                <span>Already bought</span>
                <span>${purchasedItems.reduce((s: number, it: any) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining</span>
                <span>${pendingItems.reduce((s: number, it: any) => s + parseFloat(it.estimatedCost), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Linked jobs */}
          {job && (
            <div className="card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wp-text-3)' }}>Linked jobs</div>
              <Link href={`/${locale}/jobs/${job.id}`} className="flex items-center justify-between text-xs py-1" style={{ color: 'var(--wp-text-2)' }}>
                <span className="font-medium" style={{ color: 'var(--wp-brand)' }}>{job.name}</span>
                <span>{items.length} items</span>
              </Link>
            </div>
          )}

          {/* Vendors summary */}
          {uniqueVendors.length > 0 && (
            <div className="card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--wp-text-3)' }}>
                {locale === 'es' ? 'Proveedores' : 'Vendors'}
              </div>
              <div className="space-y-1">
                {vendorGroups.map(([vendor, vItems]) => (
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
        </div>
        </div>{/* end 2-col grid */}

      {/* Bulk action bar — fixed bottom on mobile, sticky on desktop */}
      {selectMode && (
        <div
          className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 z-30 px-4 py-3 flex items-center gap-3 shadow-lg"
          style={{ background: 'var(--wp-bg-primary)', borderTop: '1px solid var(--wp-border)' }}
        >
          <button
            onClick={selectAllPending}
            className="text-xs font-medium underline shrink-0"
            style={{ color: 'var(--wp-accent)' }}
          >
            Select all ({pendingItems.length})
          </button>
          <span className="flex-1 text-sm" style={{ color: 'var(--wp-text-secondary)' }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkPurchase}
            disabled={saving || selectedIds.size === 0 || !list.jobId}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {saving ? '...' : `Mark ${selectedIds.size} purchased`}
          </button>
          <button
            onClick={toggleSelectMode}
            className="btn-secondary btn-sm"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
