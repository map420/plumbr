'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Save, Plus, X } from 'lucide-react'
import { saveAiPreference, deleteAiPreference } from '@/lib/actions/ai-preferences'
import { SectionCard } from '../SectionCard'

export type AiPref = {
  id: string
  key: string
  value: string
  learnedFrom: string | null
  createdAt: Date
  updatedAt: Date
}

export function AiPreferencesSection({
  initial, locale,
}: {
  initial: AiPref[]
  locale: string
}) {
  const router = useRouter()
  const [prefs, setPrefs] = useState(initial)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [showNew, setShowNew] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const es = locale === 'es'

  function handleSave(key: string) {
    const value = edits[key]
    if (value === undefined) return
    startTransition(async () => {
      await saveAiPreference(key, value, 'user_edited')
      setPrefs(prev => prev.map(p => p.key === key ? { ...p, value, learnedFrom: 'user_edited' } : p))
      setEdits(prev => {
        const { [key]: _omit, ...rest } = prev
        void _omit
        return rest
      })
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 2500)
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
      setPrefs(prev => [...prev, created as AiPref])
      setNewKey(''); setNewValue(''); setShowNew(false)
      router.refresh()
    })
  }

  return (
    <SectionCard
      title={es ? 'Preferencias de IA' : 'AI preferences'}
      subtitle={es ? 'Lo que el asistente ha aprendido sobre cómo trabajas. Edita o elimina lo que esté mal.' : 'Things the assistant has learned about how you work. Edit or remove anything that\'s wrong.'}
      footer={
        !showNew ? (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="btn-primary btn-sm inline-flex items-center gap-1"
          >
            <Plus size={13} /> {es ? 'Agregar' : 'Add preference'}
          </button>
        ) : undefined
      }
    >
      {/* Existing prefs */}
      {prefs.length === 0 && !showNew && (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--wp-text-3)' }}>
          {es
            ? 'Sin preferencias aún. El asistente las irá guardando mientras aprende cómo trabajas.'
            : 'No preferences yet. The assistant will save things here as it learns how you work.'}
        </div>
      )}

      {prefs.length > 0 && (
        <div className="divide-y" style={{ borderColor: 'var(--wp-border-light)' }}>
          {prefs.map(p => {
            const draft = edits[p.key]
            const isDirty = draft !== undefined && draft !== p.value
            return (
              <div key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold" style={{ color: 'var(--wp-text-3)' }}>{p.key}</p>
                    <textarea
                      rows={1}
                      value={draft ?? p.value}
                      onChange={e => setEdits(prev => ({ ...prev, [p.key]: e.target.value }))}
                      className="w-full mt-1 bg-transparent text-sm resize-none focus:outline-none"
                      style={{ color: 'var(--wp-text)' }}
                    />
                    {p.learnedFrom && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--wp-text-3)' }}>
                        {p.learnedFrom === 'user_edited' || p.learnedFrom === 'user_added'
                          ? (es ? 'Editada por ti' : 'Edited by you')
                          : (es ? `Aprendida de: ${p.learnedFrom}` : `Learned from: ${p.learnedFrom}`)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {savedKey === p.key && (
                      <span className="text-xs font-medium" style={{ color: 'var(--wp-success-v2)' }}>
                        {es ? 'Guardado ✓' : 'Saved ✓'}
                      </span>
                    )}
                    {isDirty && (
                      <button
                        onClick={() => handleSave(p.key)}
                        disabled={isPending}
                        className="p-1.5 rounded-md"
                        style={{ color: 'var(--wp-success-v2)' }}
                        title={es ? 'Guardar' : 'Save'}
                      >
                        <Save size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.key)}
                      disabled={isPending}
                      className="p-1.5 rounded-md"
                      style={{ color: 'var(--wp-error-v2)' }}
                      title={es ? 'Eliminar' : 'Delete'}
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

      {/* New pref form */}
      {showNew && (
        <div className="py-3">
          <form onSubmit={handleAdd} className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--wp-surface-2)' }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>Key</label>
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="e.g. default_markup"
                className="input text-sm w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--wp-text-2)' }}>Value</label>
              <textarea
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                rows={2}
                placeholder="e.g. 20%"
                className="input text-sm w-full resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowNew(false); setNewKey(''); setNewValue('') }} className="btn-secondary btn-sm">
                <X size={12} /> {es ? 'Cancelar' : 'Cancel'}
              </button>
              <button type="submit" disabled={isPending || !newKey.trim() || !newValue.trim()} className="btn-primary btn-sm">
                <Save size={12} /> {isPending ? '...' : (es ? 'Guardar' : 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </SectionCard>
  )
}
