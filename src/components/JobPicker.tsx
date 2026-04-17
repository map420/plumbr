'use client'

import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { searchJobs } from '@/lib/actions/jobs'

export type JobPickerOption = {
  id: string
  name: string
  clientName: string
  status: string
}

export function JobPicker({
  value,
  onChange,
  placeholder = 'Seleccionar job...',
  allowNone = true,
}: {
  value: JobPickerOption | null
  onChange: (job: JobPickerOption | null) => void
  placeholder?: string
  allowNone?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<JobPickerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Position the floating panel
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    function updatePos() {
      const rect = btnRef.current!.getBoundingClientRect()
      const panelHeight = 320
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < panelHeight && rect.top > panelHeight
      setPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
    updatePos()
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // Load options (debounced)
  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    const t = setTimeout(() => {
      searchJobs(query)
        .then(data => { if (active) setOptions(data) })
        .catch(err => console.error('searchJobs failed:', err))
        .finally(() => { if (active) setLoading(false) })
    }, 150)
    return () => { active = false; clearTimeout(t) }
  }, [open, query])

  const panel = open && pos && mounted ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        width: pos.width,
        background: 'var(--wp-bg-primary)',
        border: '1px solid var(--wp-border)',
        borderRadius: 8,
        boxShadow: 'var(--wp-shadow-md)',
        zIndex: 9999,
        maxHeight: 320,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: 8, borderBottom: '1px solid var(--wp-border-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={13} style={{ color: 'var(--wp-text-muted)' }} />
        <input
          autoFocus
          placeholder="Buscar job..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--wp-text-primary)' }}
        />
      </div>
      <div style={{ overflow: 'auto', flex: 1 }}>
        {loading && options.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--wp-text-muted)' }}>Cargando...</div>
        ) : options.length === 0 ? (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--wp-text-muted)' }}>
            {query ? 'Sin resultados' : 'No tienes jobs creados todavía'}
          </div>
        ) : (
          <>
            {allowNone && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '8px 12px', border: 'none', background: 'transparent',
                  fontSize: 12, color: 'var(--wp-text-muted)', cursor: 'pointer', textAlign: 'left',
                  fontStyle: 'italic',
                }}
              >
                {!value && <Check size={13} style={{ marginRight: 6 }} />}
                Sin job
              </button>
            )}
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); setQuery('') }}
                style={{
                  display: 'flex', alignItems: 'center', width: '100%',
                  padding: '8px 12px', border: 'none', background: 'transparent',
                  fontSize: 13, color: 'var(--wp-text-primary)', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--wp-bg-muted)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {value?.id === opt.id && <Check size={13} style={{ marginRight: 6, color: 'var(--wp-primary)' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--wp-text-muted)' }}>{opt.clientName} · {opt.status}</div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', padding: '6px 10px',
          borderRadius: 6, border: '1px solid var(--wp-border)',
          background: 'var(--wp-bg-primary)', color: 'var(--wp-text-primary)',
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? `${value.name} · ${value.clientName}` : <span style={{ color: 'var(--wp-text-muted)' }}>{placeholder}</span>}
        </span>
        {value && allowNone && (
          <X
            size={13}
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            style={{ color: 'var(--wp-text-muted)', cursor: 'pointer' }}
          />
        )}
        <ChevronDown size={14} style={{ color: 'var(--wp-text-muted)' }} />
      </button>
      {panel}
    </div>
  )
}
