'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Check, ExternalLink, Briefcase } from 'lucide-react'
import { createExpense, deleteExpense } from '@/lib/actions/expenses'
import {
  saveChecklistAsList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  markItemPurchased,
  markListCompleted,
} from '@/lib/actions/shopping-lists'
import { getJob } from '@/lib/actions/jobs'
import { JobPicker, type JobPickerOption } from '@/components/JobPicker'
import './rich-blocks.css'

// Sanitize assistant-generated text before rendering as HTML. The system
// prompt restricts output to plain markdown, but a user / client name loaded
// from the DB could contain raw HTML. We escape everything then allow back a
// tiny whitelist (<b>, <i>, <br>, <strong>, <em>) used for emphasis.
function sanitizeAssistantHtml(input: string): string {
  if (!input) return ''
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  return escaped.replace(
    /&lt;(\/?(?:b|i|br|strong|em))&gt;/gi,
    (_m, tag: string) => `<${tag.toLowerCase()}>`,
  )
}

// ── Types ──
type ProseBlock = { type: 'prose'; content: string }
type MetricsBlock = { type: 'metrics'; items: { value: string; label: string; color?: string }[] }
type ClientsBlock = { type: 'clients'; items: { name: string; pct: string; amount: string; dotColor?: string }[] }
type InsightBlock = { type: 'insights'; items: { variant: 'positive' | 'negative' | 'warning' | 'info'; icon: string; text: string }[] }
type ListBlock = { type: 'list'; items: { icon: string; text: string }[] }
type TableBlock = { type: 'table'; headers: string[]; rows: string[][] }
type ActionsBlock = { type: 'actions'; items: { label: string; variant: 'primary' | 'ghost'; action: string }[] }
type ChecklistBlock = { type: 'checklist'; jobId: string; items: { description: string; estimatedCost: number }[] }

export type RichBlock = ProseBlock | MetricsBlock | ClientsBlock | InsightBlock | ListBlock | TableBlock | ActionsBlock | ChecklistBlock

// ── Prose ──
// All read-only blocks are memoized — they re-render only when their props
// change by identity, which keeps a long assistant conversation from
// re-rendering every older block when the latest one streams a new token.
const RichProse = React.memo(function RichProse({ content }: { content: string }) {
  return <div className="blk-prose" dangerouslySetInnerHTML={{ __html: sanitizeAssistantHtml(content) }} />
})

// ── Metrics Strip ──
const RichMetrics = React.memo(function RichMetrics({ items }: { items: MetricsBlock['items'] }) {
  return (
    <div className="blk-metrics">
      {items.map((item, i) => (
        <div key={i} className="blk-metric-item">
          <div className="blk-metric-val" style={item.color ? { color: `var(--wp-${item.color})` } : undefined}>{item.value}</div>
          <div className="blk-metric-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
})

// ── Client Breakdown ──
const RichClients = React.memo(function RichClients({ items }: { items: ClientsBlock['items'] }) {
  return (
    <div className="blk-clients">
      {items.map((client, i) => (
        <React.Fragment key={i}>
          <div className="blk-client-row">
            <div className={`blk-client-dot ${client.dotColor || 'primary'}`} />
            <div className="blk-client-detail">
              <div className="blk-client-name">{client.name}</div>
              <div className="blk-client-pct">{client.pct}</div>
            </div>
            <div className="blk-client-amount">{client.amount}</div>
          </div>
          {client.pct && (
            <div className="blk-client-bar">
              <div className="blk-client-bar-fill" style={{ width: client.pct }} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
})

// ── Insights ──
const RichInsights = React.memo(function RichInsights({ items }: { items: InsightBlock['items'] }) {
  return (
    <div className="blk-insights">
      {items.map((item, i) => (
        <div key={i} className={`blk-insight ${item.variant}`}>
          <span className="blk-insight-icon">{item.icon}</span>
          <span dangerouslySetInnerHTML={{ __html: sanitizeAssistantHtml(item.text) }} />
        </div>
      ))}
    </div>
  )
})

// ── List ──
const RichList = React.memo(function RichList({ items }: { items: ListBlock['items'] }) {
  return (
    <div className="blk-list">
      {items.map((item, i) => (
        <div key={i} className="blk-list-item">
          <div className={`blk-list-icon ${item.icon === '✓' ? 'done' : item.icon === '!' ? 'pending' : ''}`}>
            {item.icon}
          </div>
          <div dangerouslySetInnerHTML={{ __html: sanitizeAssistantHtml(item.text) }} />
        </div>
      ))}
    </div>
  )
})

// ── Table ──
const RichTable = React.memo(function RichTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="blk-table">
      <div className="blk-table-head">
        {headers.map((h, i) => <span key={i}>{h}</span>)}
      </div>
      {rows.map((row, i) => (
        <div key={i} className="blk-table-row">
          {row.map((cell, j) => <span key={j}>{cell}</span>)}
        </div>
      ))}
    </div>
  )
})

// ── Actions ──
function RichActions({ items, onAction }: { items: ActionsBlock['items']; onAction: (action: string) => void }) {
  return (
    <div className="blk-actions">
      {items.map((item, i) => (
        <button key={i} onClick={() => onAction(item.action)}
          className={`blk-action-btn ${item.variant === 'primary' ? 'blk-action-primary' : 'blk-action-ghost'}`}>
          {item.label} <span className="blk-action-arrow">→</span>
        </button>
      ))}
    </div>
  )
}

// ── Checklist (material → expense) ──
type ChecklistItem = { id?: string; description: string; estimatedCost: number; expenseId?: string }

export function RichChecklist({
  jobId: propJobId,
  jobResolved = false,
  items: initialItems,
}: {
  jobId?: string
  jobResolved?: boolean
  items: ChecklistBlock['items']
}) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems.map(it => ({ ...it })))
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<number | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')

  // Job linking state
  const [resolvedJob, setResolvedJob] = useState<JobPickerOption | null>(null)
  const [pickerJob, setPickerJob] = useState<JobPickerOption | null>(null)

  // Persistence state
  const [listId, setListId] = useState<string | null>(null)
  const [savingList, setSavingList] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [listName, setListName] = useState('')
  const [saveMode, setSaveMode] = useState<'later' | 'close' | null>(null)  // which button triggered the form
  const [savedAnimating, setSavedAnimating] = useState(false)  // trigger animation on save
  const [listClosed, setListClosed] = useState(false)  // list was closed via "Ya compré todo"
  const isSaved = listId !== null
  const hasChecked = checked.size > 0
  const checkedTotal = items.reduce((s, it, i) => checked.has(i) ? s + it.estimatedCost : s, 0)

  // Active jobId (used by register/edit flows) — prefers propJobId if resolved, else pickerJob after save
  const activeJobId = propJobId || pickerJob?.id || null

  // Load resolved job info (so save form can show readonly chip)
  useEffect(() => {
    if (jobResolved && propJobId && !resolvedJob) {
      getJob(propJobId)
        .then(j => {
          if (j) setResolvedJob({ id: j.id, name: j.name, clientName: j.clientName, status: j.status })
        })
        .catch(err => console.error('Failed to load job:', err))
    }
  }, [jobResolved, propJobId, resolvedJob])

  // ── Save the list (base flow: persist + link) ──
  async function persistList(jobIdToSave: string | undefined): Promise<string | null> {
    const name = listName.trim() || `Lista ${new Date().toLocaleDateString()}`
    // If already saved, return existing id
    if (listId) return listId
    const result = await saveChecklistAsList({
      name,
      jobId: jobIdToSave,
      items: items.map((it, idx) => ({
        description: it.description,
        estimatedCost: it.estimatedCost,
        expenseId: checked.has(idx) ? it.expenseId : undefined,
      })),
    })
    setItems(prev => prev.map((it, idx) => ({
      ...it,
      id: result.items[idx]?.id,
    })))
    setListId(result.list.id)
    return result.list.id
  }

  // ── "Comprar después" — save list as active and show confirmation animation ──
  async function handleSaveForLater() {
    const jobIdToSave = jobResolved ? propJobId : pickerJob?.id
    setSavingList(true)
    try {
      await persistList(jobIdToSave)
      setShowSaveForm(false)
      setSaveMode(null)
      // Trigger save animation
      setSavedAnimating(true)
      setTimeout(() => setSavedAnimating(false), 2000)
    } catch (err) {
      console.error('Failed to save list:', err)
    } finally {
      setSavingList(false)
    }
  }

  // ── "Ya compré todo" — register expenses for checked items + close list ──
  async function handleCloseList() {
    const jobIdToUse = jobResolved ? propJobId : pickerJob?.id
    if (!jobIdToUse) return  // shouldn't happen — UI should block

    setSavingList(true)
    try {
      // 1. Persist list if not already saved
      const finalListId = await persistList(jobIdToUse)
      if (!finalListId) throw new Error('List save failed')

      // 2. Register expenses for each checked item that doesn't already have an expense
      const currentItems = items  // snapshot
      const toRegister = currentItems
        .map((it, idx) => ({ it, idx }))
        .filter(({ it, idx }) => checked.has(idx) && !it.expenseId)

      const results = await Promise.allSettled(
        toRegister.map(async ({ it, idx }) => {
          if (it.id) {
            const result = await markItemPurchased(it.id, jobIdToUse, String(it.estimatedCost))
            return { idx, expenseId: result.expenseId }
          } else {
            const expense = await createExpense(jobIdToUse, {
              description: it.description,
              type: 'material',
              amount: String(it.estimatedCost),
              date: new Date().toISOString(),
            })
            return { idx, expenseId: expense.id }
          }
        })
      )

      // Update items with their new expenseIds
      setItems(prev => prev.map((it, idx) => {
        const match = results.find(r => r.status === 'fulfilled' && r.value.idx === idx)
        if (match && match.status === 'fulfilled') return { ...it, expenseId: match.value.expenseId }
        return it
      }))

      // 3. Mark list as completed
      await markListCompleted(finalListId)

      setShowSaveForm(false)
      setSaveMode(null)
      setListClosed(true)
    } catch (err) {
      console.error('Failed to close list:', err)
    } finally {
      setSavingList(false)
    }
  }

  // ── Register expense (checkbox tap) ──
  async function handleRegister(idx: number) {
    if (!activeJobId) {
      // Can't create an expense without a job — prompt to save+link first
      setShowSaveForm(true)
      return
    }
    const item = items[idx]
    setSaving(idx)
    try {
      if (isSaved && item.id) {
        const result = await markItemPurchased(item.id, activeJobId, String(item.estimatedCost))
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, expenseId: result.expenseId } : it))
      } else {
        const expense = await createExpense(activeJobId, {
          description: item.description,
          type: 'material',
          amount: String(item.estimatedCost),
          date: new Date().toISOString(),
        })
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, expenseId: expense.id } : it))
      }
      setChecked(prev => new Set(prev).add(idx))
    } catch (err) {
      console.error('Failed to register:', err)
    } finally {
      setSaving(null)
    }
  }

  // ── Save edits (inline fields) ──
  async function handleSaveEdit(idx: number) {
    const item = items[idx]
    const newDesc2 = editDesc.trim() || item.description
    const newAmount = editAmount ? parseFloat(editAmount) : item.estimatedCost
    const isDone = checked.has(idx)
    setSaving(idx)
    try {
      // Update in DB if saved
      if (isSaved && item.id) {
        await updateShoppingListItem(item.id, {
          description: newDesc2,
          estimatedCost: String(newAmount),
        })
      }
      // Update linked expense if already purchased
      if (isDone && item.expenseId && activeJobId) {
        await deleteExpense(item.expenseId)
        const expense = await createExpense(activeJobId, {
          description: newDesc2,
          type: 'material',
          amount: String(newAmount),
          date: new Date().toISOString(),
        })
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: newDesc2, estimatedCost: newAmount, expenseId: expense.id } : it))
      } else {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, description: newDesc2, estimatedCost: newAmount } : it))
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
    } finally {
      setSaving(null)
    }
    setEditing(null)
    setEditDesc('')
    setEditAmount('')
  }

  // ── Delete item ──
  async function handleDelete(idx: number) {
    const item = items[idx]
    setRemoving(idx)
    try {
      if (isSaved && item.id) {
        await deleteShoppingListItem(item.id)
      }
      if (checked.has(idx) && item.expenseId) {
        await deleteExpense(item.expenseId)
      }
      setTimeout(() => {
        setItems(prev => prev.filter((_, i) => i !== idx))
        setChecked(prev => {
          const next = new Set<number>()
          prev.forEach(v => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1) })
          return next
        })
        setRemoving(null)
        setConfirmDelete(null)
      }, 300)
    } catch (err) {
      console.error('Failed to delete:', err)
      setRemoving(null)
    }
  }

  async function handleAddItem() {
    if (!newDesc.trim() || !newCost) return
    const description = newDesc.trim()
    const estimatedCost = parseFloat(newCost)
    if (isSaved && listId) {
      try {
        const item = await addShoppingListItem(listId, {
          description,
          estimatedCost: String(estimatedCost),
        })
        setItems(prev => [...prev, { id: item.id, description, estimatedCost }])
      } catch (err) {
        console.error('Failed to add item:', err)
        return
      }
    } else {
      setItems(prev => [...prev, { description, estimatedCost }])
    }
    setNewDesc('')
    setNewCost('')
    setShowAddForm(false)
  }

  function openEdit(idx: number) {
    const item = items[idx]
    setEditing(idx)
    setEditDesc(item.description)
    setEditAmount(String(item.estimatedCost))
  }

  const pendingTotal = items.reduce((s, item, i) => checked.has(i) ? s : s + item.estimatedCost, 0)
  const checklistTotal = items.reduce((s, it) => s + it.estimatedCost, 0)
  const purchasedTotal = items.reduce((s, it, i) => checked.has(i) ? s + it.estimatedCost : s, 0)
  const purchasedPct = checklistTotal > 0 ? (purchasedTotal / checklistTotal) * 100 : 0
  const remaining = checklistTotal - purchasedTotal

  return (
    <div className="blk-checklist" onClick={() => setConfirmDelete(null)}>
      {/* Progress bar */}
      {checklistTotal > 0 && (
        <div className="blk-checklist-budget">
          <div className="blk-checklist-budget-labels">
            <span>Comprado: <strong>${purchasedTotal.toLocaleString()}</strong></span>
            <span>Total: <strong>${checklistTotal.toLocaleString()}</strong></span>
          </div>
          <div className="blk-checklist-budget-bar">
            <div className="blk-checklist-budget-fill" style={{ width: `${purchasedPct}%` }} />
          </div>
          <div className="blk-checklist-budget-pct">
            {remaining > 0
              ? `${Math.round(purchasedPct)}% — faltan $${remaining.toLocaleString()}`
              : 'Lista completa'
            }
          </div>
        </div>
      )}

      {items.map((item, idx) => {
        const isDone = checked.has(idx)
        const isEditing = editing === idx
        const isSaving = saving === idx
        const isRemoving = removing === idx
        const showDeleteConfirm = confirmDelete === idx
        const isSkipped = listClosed && !isDone  // unchecked items when list is closed

        return (
          <div key={idx} className={`blk-checklist-item ${isDone ? 'done' : ''} ${isSkipped ? 'skipped' : ''} ${isRemoving ? 'removing' : ''}`}>
            {/* Main row */}
            <div className="blk-checklist-row">
              {/* Checkbox — tap to register */}
              <div
                className={`blk-checklist-check ${isDone ? 'checked' : ''} ${isSaving ? 'saving' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isDone && !isSaving) handleRegister(idx)
                }}
              >
                {isDone && '✓'}
              </div>

              {/* Description + Cost — click to edit */}
              {isEditing ? (
                <>
                  <input
                    className="blk-checklist-name-input"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(idx); if (e.key === 'Escape') { setEditing(null); setEditDesc(''); setEditAmount('') } }}
                    autoFocus
                  />
                  <input
                    type="number"
                    className="blk-checklist-input"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(idx); if (e.key === 'Escape') { setEditing(null); setEditDesc(''); setEditAmount('') } }}
                    min="0"
                    step="0.01"
                  />
                </>
              ) : (
                <>
                  <span className="blk-checklist-desc" onClick={(e) => { e.stopPropagation(); openEdit(idx) }}>{item.description}</span>
                  <span className="blk-checklist-cost" onClick={(e) => { e.stopPropagation(); openEdit(idx) }}>${item.estimatedCost.toLocaleString()}</span>
                  <button
                    className="blk-checklist-delete-btn"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(idx) }}
                    aria-label="Eliminar item"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

            {/* Edit bar */}
            {isEditing && (
              <div className="blk-checklist-edit-bar">
                <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(idx) }} disabled={isSaving} className="blk-checklist-btn confirm">
                  {isSaving ? '...' : 'Guardar'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditing(null); setEditDesc(''); setEditAmount('') }} className="blk-checklist-btn cancel">
                  Cancelar
                </button>
              </div>
            )}

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="blk-checklist-delete-confirm" onClick={e => e.stopPropagation()}>
                <span className="blk-checklist-delete-msg">
                  {isDone ? 'Esto eliminará el gasto registrado' : 'Eliminar este item'}
                </span>
                <button onClick={() => handleDelete(idx)} className="blk-checklist-btn danger">Eliminar</button>
                <button onClick={() => setConfirmDelete(null)} className="blk-checklist-btn cancel">Cancelar</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Add new item */}
      {showAddForm ? (
        <div className="blk-checklist-add-form">
          <input
            className="blk-checklist-name-input"
            placeholder="Descripción del item"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            autoFocus
          />
          <input
            type="number"
            className="blk-checklist-input"
            placeholder="Costo"
            value={newCost}
            onChange={e => setNewCost(e.target.value)}
            min="0"
            step="0.01"
          />
          <button onClick={handleAddItem} disabled={!newDesc.trim() || !newCost} className="blk-checklist-btn confirm">Agregar</button>
          <button onClick={() => { setShowAddForm(false); setNewDesc(''); setNewCost('') }} className="blk-checklist-btn cancel">Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)} className="blk-checklist-add-btn">+ Agregar item</button>
      )}

      {pendingTotal > 0 && (
        <div className="blk-checklist-total">
          Pendiente: <span className="blk-checklist-total-amount">${pendingTotal.toLocaleString()}</span>
        </div>
      )}

      {/* Footer: Ya compré todo + Comprar después */}
      {listClosed ? (
        /* Closed state — show link to completed list */
        <a href={`/shopping-list/${listId}`} className="blk-checklist-closed">
          <Check size={14} />
          <span>Lista cerrada · Compras registradas</span>
          <ExternalLink size={12} className="blk-checklist-saved-icon" />
        </a>
      ) : showSaveForm ? (
        /* Inline form — asks for name + job when needed */
        <div className="blk-checklist-save-form" onClick={e => e.stopPropagation()}>
          <div className="blk-checklist-save-field">
            <input
              className="blk-checklist-name-input"
              placeholder="Nombre de la lista"
              value={listName}
              onChange={e => setListName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setShowSaveForm(false); setSaveMode(null) }
                if (e.key === 'Enter' && (jobResolved || pickerJob || saveMode === 'later')) {
                  if (saveMode === 'close') handleCloseList()
                  else handleSaveForLater()
                }
              }}
              autoFocus
            />
          </div>
          <div className="blk-checklist-save-field">
            {jobResolved && resolvedJob ? (
              <div className="blk-checklist-job-chip">
                <Briefcase size={12} />
                <span>{resolvedJob.name} · {resolvedJob.clientName}</span>
              </div>
            ) : (
              <JobPicker
                value={pickerJob}
                onChange={setPickerJob}
                placeholder={saveMode === 'close' ? 'Elegir job (requerido)' : 'Elegir job (opcional)'}
              />
            )}
          </div>
          {saveMode === 'close' && (
            <div className="blk-checklist-save-hint">
              Se registrarán {checked.size} compras por ${checkedTotal.toLocaleString()}
            </div>
          )}
          <div className="blk-checklist-save-actions">
            <button
              onClick={saveMode === 'close' ? handleCloseList : handleSaveForLater}
              disabled={savingList || (saveMode === 'close' && !jobResolved && !pickerJob)}
              className="blk-checklist-btn confirm"
            >
              {savingList ? '...' : 'Confirmar'}
            </button>
            <button
              onClick={() => { setShowSaveForm(false); setListName(''); setPickerJob(null); setSaveMode(null) }}
              className="blk-checklist-btn cancel"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="blk-checklist-footer">
          {/* "Ya compré todo" — primary */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!hasChecked) return
              const hasJob = jobResolved || pickerJob
              if (!hasJob) {
                setSaveMode('close')
                setShowSaveForm(true)
              } else {
                handleCloseList()
              }
            }}
            disabled={!hasChecked || savingList}
            className="blk-checklist-footer-btn primary"
            title={!hasChecked ? 'Marca primero los items que compraste' : undefined}
          >
            {savingList && saveMode === 'close'
              ? 'Registrando...'
              : hasChecked
                ? `Ya compré${items.length === checked.size ? ' todo' : ` ${checked.size}`}${checkedTotal > 0 ? ` · $${checkedTotal.toLocaleString()}` : ''}`
                : 'Ya compré todo'}
          </button>

          {/* "Comprar después" — secondary; becomes "Ver lista" when saved */}
          {isSaved ? (
            <a href={`/shopping-list/${listId}`} className={`blk-checklist-footer-btn secondary ${savedAnimating ? 'just-saved' : ''}`}>
              {savedAnimating ? (
                <>
                  <Check size={14} className="blk-checklist-check-anim" />
                  <span>¡Guardada!</span>
                </>
              ) : (
                <>
                  <span>Ver lista</span>
                  <ExternalLink size={12} />
                </>
              )}
            </a>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSaveMode('later')
                setShowSaveForm(true)
              }}
              disabled={savingList}
              className="blk-checklist-footer-btn secondary"
            >
              {savingList && saveMode === 'later' ? 'Guardando...' : 'Comprar después'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Block Renderer ──
export function RichBlockRenderer({ blocks, onAction }: { blocks: RichBlock[]; onAction: (action: string) => void }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  return (
    <div className="rich-blocks">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'prose': return <RichProse key={i} content={block.content} />
          case 'metrics': return <RichMetrics key={i} items={block.items} />
          case 'clients': return <RichClients key={i} items={block.items} />
          case 'insights': return <RichInsights key={i} items={block.items} />
          case 'list': return <RichList key={i} items={block.items} />
          case 'table': return <RichTable key={i} headers={block.headers} rows={block.rows} />
          case 'actions': return <RichActions key={i} items={block.items} onAction={onAction} />
          case 'checklist': return <RichChecklist key={i} jobId={block.jobId} items={block.items} />
          default: return null
        }
      })}
    </div>
  )
}

// ── Parser ──
export function parseRichBlocks(text: string): { plainText: string; blocks: RichBlock[] | null } {
  const blockMatch = text.match(/```blocks\s*\n?([\s\S]*?)\n?```/)
  if (!blockMatch) return { plainText: text, blocks: null }

  const plainText = text.replace(/```blocks\s*\n?[\s\S]*?\n?```/g, '').trim()
  try {
    const parsed = JSON.parse(blockMatch[1])
    if (!Array.isArray(parsed)) return { plainText: text, blocks: null }
    return { plainText, blocks: parsed as RichBlock[] }
  } catch {
    return { plainText: text, blocks: null }
  }
}
