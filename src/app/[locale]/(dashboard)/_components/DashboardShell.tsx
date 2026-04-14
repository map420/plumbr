'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { NotificationBell } from './NotificationBell'

export default function DashboardShell({ children, pro }: { children: React.ReactNode; pro: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-60 transform transition-transform duration-200 md:relative md:translate-x-0 md:flex md:shrink-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setOpen(false)} pro={pro} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white md:hidden">
          <button onClick={() => setOpen(true)} className="text-slate-600 hover:text-slate-900">
            <Menu size={22} />
          </button>
          <span className="font-bold text-[#1E3A5F] text-lg flex-1">WorkPilot</span>
          <div className="[&_button]:text-slate-600 [&_button]:hover:text-slate-900 [&_button]:bg-transparent [&_button]:hover:bg-slate-100">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50 pb-16 md:pb-0">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
