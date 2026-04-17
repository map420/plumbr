import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

type Crumb = { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap" style={{ color: 'var(--wp-text-muted)' }}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={13} style={{ color: 'var(--wp-border)' }} />}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:opacity-80">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium" style={{ color: 'var(--wp-text-primary)' }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
