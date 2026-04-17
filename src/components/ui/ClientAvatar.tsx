/**
 * ClientAvatar — v2 avatar with deterministic color from name.
 * Used in Clients list, estimate/invoice rows, job details.
 *
 * <ClientAvatar name="Linda Chen" size="md" />
 *   → renders a circle with "LC" and a consistent dark background.
 */
import { cn } from '@/lib/utils'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

// Deterministic palette — all dark enough to read white text.
// Kept monochromatic (zinc/slate) to match v2 muted palette.
const PALETTE = [
  '#18181B', // zinc-900
  '#27272A', // zinc-800
  '#3F3F46', // zinc-700
  '#52525B', // zinc-600
  '#0F172A', // slate-900
  '#1E293B', // slate-800
  '#334155', // slate-700
  '#475569', // slate-600
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'
}

export interface ClientAvatarProps {
  name: string
  /** Optional image URL — if provided and loads, replaces initials. */
  src?: string | null
  size?: AvatarSize
  className?: string
}

export function ClientAvatar({ name, src, size = 'md', className }: ClientAvatarProps) {
  const initials = initialsFromName(name)
  const bg = PALETTE[hashString(name) % PALETTE.length]
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('wp-avatar', `wp-avatar--${size}`, 'object-cover', className)}
        style={{ background: bg }}
      />
    )
  }
  return (
    <span
      className={cn('wp-avatar', `wp-avatar--${size}`, className)}
      style={{ background: bg }}
      aria-label={name}
    >
      {initials}
    </span>
  )
}
