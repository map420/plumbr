'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { FormRow } from '../FormRow'
import { SectionCard } from '../SectionCard'

const THEME_SWATCHES = {
  light: 'linear-gradient(135deg, #FAFAFA 0%, #E5E7EB 100%)',
  dark: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
  system: 'linear-gradient(135deg, #FAFAFA 0%, #FAFAFA 49%, #0F172A 50%, #0F172A 100%)',
} as const

export function AppearanceSection({ locale }: { locale: string }) {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const params = useSearchParams()
  const es = locale === 'es'

  // "Saved ✓" confirmation chip — se muestra 2s después de cualquier interacción.
  // Cambios de theme/idioma ya se persisten al instante (localStorage / URL),
  // pero el usuario necesita feedback visible de que se guardó.
  const [saved, setSaved] = useState(false)
  function flashSaved() {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  const [detected, setDetected] = useState<'light' | 'dark' | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDetected(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setDetected(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Swap locale prefix in current pathname, preserving query (incl. ?tab=...)
  function languageHref(target: 'en' | 'es') {
    const segments = pathname.split('/')
    segments[1] = target
    const qs = params.toString()
    return `${segments.join('/')}${qs ? `?${qs}` : ''}`
  }

  return (
    <SectionCard
      title={es ? 'Apariencia' : 'Appearance'}
      subtitle={es ? 'Tema e idioma de la interfaz' : 'UI theme and language'}
      headerRight={
        saved ? (
          <span
            className="text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 transition-opacity"
            style={{ background: 'var(--wp-success-bg-v2)', color: 'var(--wp-success-v2)', border: '1px solid var(--wp-success-border)' }}
            role="status"
            aria-live="polite"
          >
            ✓ {es ? 'Guardado' : 'Saved'}
          </span>
        ) : null
      }
    >
      <FormRow
        label={es ? 'Tema' : 'Theme'}
        subtitle={
          theme === 'system' && detected
            ? (es ? `Automático — actualmente: ${detected === 'dark' ? 'oscuro' : 'claro'}` : `Automatic — currently: ${detected}`)
            : (es ? 'Claro, oscuro o automático' : 'Light, dark or automatic')
        }
      >
        <div className="flex gap-2 flex-wrap">
          {(['light', 'dark', 'system'] as const).map(t => {
            const isActive = theme === t
            const label = {
              light: es ? 'Claro' : 'Light',
              dark: es ? 'Oscuro' : 'Dark',
              system: es ? 'Sistema' : 'System',
            }[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => { setTheme(t); flashSaved() }}
                className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all"
                style={{
                  background: isActive ? 'var(--wp-surface-2)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--wp-brand)' : 'var(--wp-border-v2)'}`,
                  boxShadow: isActive ? '0 0 0 2px var(--wp-brand-bg, rgba(59,130,246,0.15))' : 'none',
                }}
                aria-pressed={isActive}
              >
                <div
                  className="w-10 h-10 rounded-md"
                  style={{ background: THEME_SWATCHES[t], border: '1px solid var(--wp-border-light)' }}
                />
                <span className="text-xs font-medium" style={{ color: isActive ? 'var(--wp-text)' : 'var(--wp-text-2)' }}>{label}</span>
              </button>
            )
          })}
        </div>
      </FormRow>

      <FormRow
        label={es ? 'Idioma' : 'Language'}
        subtitle={es ? 'Afecta todos los textos de la app' : 'Applies across the whole app'}
      >
        <div className="flex gap-1.5">
          {[
            { code: 'en' as const, label: 'English' },
            { code: 'es' as const, label: 'Español' },
          ].map(l => {
            const isActive = locale === l.code
            return (
              <Link
                key={l.code}
                href={languageHref(l.code)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--wp-text)' : 'var(--wp-surface-2)',
                  color: isActive ? 'var(--wp-text-inverse)' : 'var(--wp-text-2)',
                  border: '1px solid var(--wp-border-v2)',
                }}
              >
                {l.label}
              </Link>
            )
          })}
        </div>
      </FormRow>
    </SectionCard>
  )
}
