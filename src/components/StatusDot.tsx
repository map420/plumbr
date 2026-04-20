/**
 * StatusDot — indicador visual con glow radial sutil.
 * Reemplaza los `<span className="w-2 h-2 rounded-full bg-X" />` regados por la app.
 * El glow es crítico en dark mode: sin él los dots se pierden sobre bg oscuro.
 */

type Variant = 'success' | 'warning' | 'error' | 'info' | 'ai' | 'neutral'

const COLORS: Record<Variant, { bg: string; glow: string }> = {
  success: { bg: 'var(--wp-success-v2)', glow: 'rgba(74, 222, 128, 0.5)' },
  warning: { bg: 'var(--wp-warning-v2)', glow: 'rgba(245, 158, 11, 0.5)' },
  error:   { bg: 'var(--wp-error-v2)',   glow: 'rgba(239, 68, 68, 0.5)' },
  info:    { bg: 'var(--wp-info-v2)',    glow: 'rgba(96, 165, 250, 0.5)' },
  ai:      { bg: 'var(--wp-ai)',         glow: 'rgba(14, 165, 233, 0.5)' },
  neutral: { bg: 'var(--wp-text-3)',     glow: 'rgba(161, 161, 170, 0.3)' },
}

export function StatusDot({
  variant = 'neutral',
  size = 8,
  pulse = false,
  className = '',
}: {
  variant?: Variant
  size?: number
  pulse?: boolean
  className?: string
}) {
  const { bg, glow } = COLORS[variant]
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${pulse ? 'animate-pulse-dot' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        boxShadow: `0 0 ${Math.round(size * 0.8)}px ${glow}`,
      }}
      aria-hidden="true"
    />
  )
}
