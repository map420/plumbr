'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Search, Users, Briefcase, FileText, Receipt, X, Command } from 'lucide-react'

type Result = { type: string; id: string; title: string; subtitle: string }

const TYPE_ICON: Record<string, React.ElementType> = {
  client: Users,
  job: Briefcase,
  estimate: FileText,
  invoice: Receipt,
}

const TYPE_LABEL: Record<string, string> = {
  client: 'Clients',
  job: 'Jobs',
  estimate: 'Estimates',
  invoice: 'Invoices',
}

const TYPE_ROUTE: Record<string, string> = {
  client: 'clients',
  job: 'jobs',
  estimate: 'estimates',
  invoice: 'invoices',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const locale = useLocale()
  const abortRef = useRef<AbortController | null>(null)

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') close()
    }
    function handleOpen() { setOpen(true) }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('open-command-palette', handleOpen)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('open-command-palette', handleOpen)
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }

    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: abortRef.current.signal })
        const data = await res.json()
        setResults(data.results || [])
        setSelectedIndex(0)
      } catch {}
      setLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  function close() {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function navigate(result: Result) {
    close()
    router.push(`/${locale}/${TYPE_ROUTE[result.type]}/${result.id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex])
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  if (!open) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] md:pt-[20vh]">
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={close} />
      <div className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden" style={{ background: 'var(--wp-bg-primary)', boxShadow: 'var(--wp-shadow-xl)' }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
          <Search size={18} style={{ color: 'var(--wp-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search clients, jobs, estimates, invoices..."
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: 'var(--wp-text-primary)' }}
          />
          <kbd className="hidden md:flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--wp-bg-muted)', color: 'var(--wp-text-muted)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--wp-text-muted)' }}>No results for "{query}"</p>
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICON[type] || FileText
            return (
              <div key={type}>
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wp-text-muted)' }}>
                    {TYPE_LABEL[type] || type}
                  </span>
                </div>
                {items.map(result => {
                  flatIndex++
                  const isSelected = flatIndex === selectedIndex
                  const idx = flatIndex
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: isSelected ? 'var(--wp-bg-muted)' : 'transparent' }}
                    >
                      <Icon size={16} style={{ color: 'var(--wp-text-muted)' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--wp-text-primary)' }}>{result.title}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--wp-text-muted)' }}>{result.subtitle}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--wp-border-light)' }}>
          <span className="text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>↑↓ navigate · ↵ open · esc close</span>
          <span className="hidden md:inline text-[10px]" style={{ color: 'var(--wp-text-muted)' }}>
            <kbd className="px-1 py-0.5 rounded" style={{ background: 'var(--wp-bg-muted)' }}>⌘K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  )
}
