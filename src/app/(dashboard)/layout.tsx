import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import {
  LayoutDashboard, FileText, Briefcase, Calendar, Smartphone, Receipt
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/estimates', label: 'Estimates', icon: FileText },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/field', label: 'Field', icon: Smartphone },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 plumbr-nav flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-xl font-bold tracking-tight">Plumbr</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-white/60">Account</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
