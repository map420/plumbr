'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { LayoutDashboard, Briefcase, FileText, Receipt, Wrench } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const locale = useLocale()

  const items = [
    { href: `/${locale}/dashboard`, label: 'Home', icon: LayoutDashboard },
    { href: `/${locale}/jobs`, label: 'Jobs', icon: Briefcase },
    { href: `/${locale}/estimates`, label: 'Estimates', icon: FileText },
    { href: `/${locale}/invoices`, label: 'Invoices', icon: Receipt },
    { href: `/${locale}/field`, label: 'Field', icon: Wrench },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-slate-200 flex items-stretch">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
          >
            <span className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${isActive ? 'bg-[#1E3A5F]/10 text-[#1E3A5F]' : 'text-slate-400'}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
