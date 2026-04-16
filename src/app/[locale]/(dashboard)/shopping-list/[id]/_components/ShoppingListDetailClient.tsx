'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronLeft, Copy, Check, Briefcase, MoreHorizontal, ExternalLink, Unlink, RotateCcw, Pencil, Trash2, Printer, Save, X, CheckSquare, Square } from 'lucide-react'
import { addShoppingListItem, markItemPurchased, unmarkItemPurchased, updateShoppingListJob, updateShoppingListItem, deleteShoppingListItem, bulkMarkItemsPurchased } from '@/lib/actions/shopping-lists'
import { JobPicker, type JobPickerOption } from '@/components/JobPicker'

type Item = { id: string; description: string; quantity: string | null; unit: string | null; estimatedCost: string; status: string; purchasedAt: Date | null }
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
      })
      setItems(prev => [...prev, { ...item, quantity: null, unit: null, purchasedAt: null } as any])
      setNewDesc('')
      setNewCost('')
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
    <div className="max-w-3xl">
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
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--wp-text-primary)' }}>{list.name}</h1>
          <div className="flex gap-2">
            {pendingItems.length > 1 && list.jobId && (
              <button
                onClick={toggleSelectMode}
                className="btn-secondary btn-sm flex items-center gap-1.5"
                title="Select multiple items to mark them as purchased at once"
              >
                {selectMode ? <><X size={13} /> Cancel</> : <><CheckSquare size={13} /> Select</>}
              </button>
            )}
            <Link
              href={`/${locale}/shopping-list/${list.id}/print`}
              className="btn-secondary btn-sm flex items-center gap-1.5"
              title="Print-friendly view"
            >
              <Printer size={13} /> Print
            </Link>
            <button onClick={handleShare} className="btn-secondary btn-sm flex items-center gap-1.5">
              {copied ? <><Check size={13} /> {t('copied')}</> : <><Copy size={13} /> {t('copyList')}</>}
            </button>
          </div>
        </div>

        {/* Job card */}
        {job ? (
          <div className="card p-4">
            <div className="flex items-start gap-3">
              <div
                className="rounded-lg flex items-center justify-center shrink-0"
                style={{ width: 36, height: 36, background: 'var(--wp-bg-muted)', color: 'var(--wp-text-secondary)' }}
              >
                <Briefcase size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => router.push(`/${locale}/jobs/${job.id}`)}
                  className="flex items-center gap-1 text-sm font-semibold text-left"
                  style={{ color: 'var(--wp-text-primary)' }}
                >
                  <span className="truncate">{job.name} · {job.clientName}</span>
                  <ExternalLink size={12} style={{ color: 'var(--wp-text-muted)' }} />
                </button>
                {estimate && (
                  <button
                    onClick={() => router.push(`/${locale}/estimates/${estimate.id}`)}
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--wp-text-muted)' }}
                  >
                    {t('estimateLabel')} {estimate.number}{materialBudget > 0 && ` · ${t('materialBudget')}: $${materialBudget.toLocaleString()}`}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setJobMenuOpen(o => !o)}
                  style={{ padding: 6, borderRadius: 6, color: 'var(--wp-text-muted)' }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {jobMenuOpen && (
                  <>
                    <div
                      onClick={() => setJobMenuOpen(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    />
                    <div
                      style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                        background: 'var(--wp-bg-primary)',
                        border: '1px solid var(--wp-border)',
                        borderRadius: 8,
                        boxShadow: 'var(--wp-shadow-md)',
                        zIndex: 50,
                        minWidth: 180,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => { setJobMenuOpen(false); setShowJobPicker(true) }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: 'var(--wp-text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        {t('changeJob')}
                      </button>
                      <button
                        onClick={handleUnlinkJob}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: 'var(--wp-error)', background: 'transparent', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--wp-border-light)' }}
                      >
                        <Unlink size={13} /> {t('unlink')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Budget bar (only if we have a real budget) */}
            {materialBudget > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--wp-text-muted)' }}>
                  <span>{t('spent')}: <strong className="font-mono" style={{ color: 'var(--wp-text-primary)' }}>${materialSpent.toLocaleString()}</strong></span>
                  <span>{t('budget')}: <strong className="font-mono" style={{ color: 'var(--wp-text-primary)' }}>${materialBudget.toLocaleString()}</strong></span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--wp-bg-muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${budgetPct}%`,
                    background: isOverBudget ? 'var(--wp-error)' : 'var(--wp-primary)',
                  }} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: isOverBudget ? 'var(--wp-error)' : 'var(--wp-text-muted)' }}>
                  {Math.round(budgetPct)}% {t('used')}{isOverBudget ? ` — ${t('overBudget')}` : ''}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-4 flex items-center gap-3">
            <div
              className="rounded-lg flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)' }}
            >
              <Briefcase size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium" style={{ color: 'var(--wp-text-primary)' }}>{t('sinJob')}</div>
              <div className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{t('noJobHelp')}</div>
            </div>
            <button
              onClick={() => setShowJobPicker(true)}
              className="btn-secondary btn-sm"
            >
              {t('link')}
            </button>
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

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="card overflow-hidden">
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
                            <span className="flex-1 text-sm" style={{ color: 'var(--wp-text-primary)' }}>
                              {item.description}
                              {item.quantity && (
                                <span className="text-xs ml-1" style={{ color: 'var(--wp-text-muted)' }}>
                                  × {parseFloat(item.quantity).toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
                                </span>
                              )}
                            </span>
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
                              <span className="flex-1 text-sm" style={{ color: 'var(--wp-text-primary)' }}>
                                {item.description}
                                {item.quantity && (
                                  <span className="text-xs ml-1" style={{ color: 'var(--wp-text-muted)' }}>
                                    × {parseFloat(item.quantity).toLocaleString()}{item.unit ? ` ${item.unit}` : ''}
                                  </span>
                                )}
                              </span>
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
            <input type="number" className="w-24 input text-sm font-mono" value={newCost} onChange={e => setNewCost(e.target.value)}
              placeholder={t('costPlaceholder')} min="0" step="0.01" />
            <button onClick={handleAddItem} disabled={saving || !newDesc.trim() || !newCost} className="btn-primary text-xs">{t('add')}</button>
            <button onClick={() => { setShowAdd(false); setNewDesc(''); setNewCost('') }} className="btn-secondary text-xs">{t('cancel')}</button>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--wp-text-muted)', border: '1px dashed var(--wp-border)' }}>
            + {t('addItem')}
          </button>
        )}

        {/* Purchased items */}
        {purchasedItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--wp-text-muted)' }}>
              {t('purchasedHeading')} ({purchasedItems.length})
            </p>
            <div className="card overflow-hidden">
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

        {/* Pending total */}
        {pendingTotal > 0 && !selectMode && (
          <p className="text-center text-xs" style={{ color: 'var(--wp-text-muted)' }}>
            {t('pending')}: <span className="font-mono font-semibold" style={{ color: 'var(--wp-text-primary)' }}>${pendingTotal.toLocaleString()}</span>
          </p>
        )}
      </div>

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
