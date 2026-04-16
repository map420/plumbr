'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save, Plus, X } from 'lucide-react'
import { saveAiPreference, deleteAiPreference } from '@/lib/actions/ai-preferences'

type Pref = {
  id: string
  key: string
  value: string
  learnedFrom: string | null
  createdAt: Date
  updatedAt: Date
}

export function AiPreferencesClient({ initial }: { initial: Pref[] }) {
  const router = useRouter()
  const [prefs, setPrefs] = useState(initial)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave(key: string) {
    const value = edits[key]
    if (value === undefined) return
    startTransition(async () => {
      await saveAiPreference(key, value, 'user_edited')
      setPrefs(prev => prev.map(p => p.key === key ? { ...p, value, learnedFrom: 'user_edited' } : p))
      setEdits(prev => {
        const { [key]: _omit, ...rest } = prev
        return rest
      })
      router.refresh()
    })
  }

  function handleDelete(key: string) {
    startTransition(async () => {
      await deleteAiPreference(key)
      setPrefs(prev => prev.filter(p => p.key !== key))
      router.refresh()
    })
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newKey.trim() || !newValue.trim()) return
    startTransition(async () => {
      const created = await saveAiPreference(newKey.trim(), newValue.trim(), 'user_added')
      setPrefs(prev => [...prev, created as Pref])
      setNewKey(''); setNewValue(''); setShowNew(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {prefs.length === 0 && !showNew && (
        <p className="text-sm text-center py-6 card" style={{ color: 'var(--wp-text-muted)' }}>
          No preferences yet. The assistant will save things here as it learns how you work.
        </p>
      )}

      {prefs.length > 0 && (
        <div className="card overflow-hidden">
          {prefs.map((p, i) => {
            const draft = edits[p.key]
            const isDirty = draft !== undefined && draft !== p.value
            return (
              <div
                key={p.id}
                className="px-4 py-3"
                style={i > 0 ? { borderTop: '1px solid var(--wp-border-light)' } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold" style={{ color: 'var(--wp-text-muted)' }}>{p.key}</p>
                    <textarea
                      rows={1}
                      value={draft ?? p.value}
                      onChange={e => setEdits(prev => ({ ...prev, [p.key]: e.target.value }))}
                      className="w-full mt-1 bg-transparent text-sm resize-none focus:outline-none"
                      style={{ color: 'var(--wp-text-primary)' }}
                    />
                    {p.learnedFrom && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--wp-text-muted)' }}>
                        {p.learnedFrom === 'user_edited' || p.learnedFrom === 'user_added'
                          ? 'Edited by you'
                          : `Learned from: ${p.learnedFrom}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDirty && (
                      <button
                        onClick={() => handleSave(p.key)}
                        disabled={isPending}
                        className="p-1.5 rounded hover:bg-slate-100"
                        style={{ color: 'var(--wp-success)' }}
                        title="Save"
                      >
                        <Save size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.key)}
                      disabled={isPending}
                      className="p-1.5 rounded hover:bg-red-50"
                      style={{ color: 'var(--wp-error)' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showNew ? (
        <form onSubmit={handleAdd} className="card p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Key</label>
            <input
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="e.g. default_markup"
              className="input text-sm w-full font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-secondary)' }}>Value</label>
            <textarea
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              rows={2}
              placeholder="e.g. 20%"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setShowNew(false); setNewKey(''); setNewValue('') }} className="btn-secondary btn-sm">
              <X size={14} /> Cancel
            </button>
            <button type="submit" disabled={isPending || !newKey.trim() || !newValue.trim()} className="btn-primary btn-sm">
              <Save size={14} /> {isPending ? '...' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowNew(true)} className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
          style={{ color: 'var(--wp-text-muted)', border: '1px dashed var(--wp-border)' }}>
          <Plus size={14} /> Add preference
        </button>
      )}
    </div>
  )
}
