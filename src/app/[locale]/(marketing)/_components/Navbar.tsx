'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X, Wrench, ChevronDown } from 'lucide-react'

const TRADES = [
  { label: 'Plumbers', slug: 'plumbers' },
  { label: 'Electricians', slug: 'electricians' },
  { label: 'Roofers', slug: 'roofers' },
  { label: 'HVAC', slug: 'hvac' },
  { label: 'General Contractors', slug: 'general-contractors' },
  { label: 'Landscapers', slug: 'landscapers' },
  { label: 'Painters', slug: 'painters' },
  { label: 'Remodelers', slug: 'remodelers' },
]

export function Navbar({ locale, isSignedIn }: { locale: string; isSignedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [tradesOpen, setTradesOpen] = useState(false)
  const [mobileTradesOpen, setMobileTradesOpen] = useState(false)
  const tradesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tradesRef.current && !tradesRef.current.contains(e.target as Node)) {
        setTradesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ctaHref = isSignedIn ? `/${locale}/dashboard` : `/${locale}/sign-up`
  const ctaLabel = isSignedIn ? 'Dashboard' : 'Start free trial'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-slate-100 shadow-sm' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-[#1E3A5F] rounded-lg flex items-center justify-center">
            <Wrench size={14} className="text-white" />
          </div>
          <span className="text-xl font-extrabold text-[#1E3A5F] tracking-tight">WorkPilot</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#1E3A5F] transition-colors">
            Features
          </a>

          {/* Trades dropdown */}
          <div className="relative" ref={tradesRef}>
            <button
              onClick={() => setTradesOpen(o => !o)}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#1E3A5F] transition-colors"
              aria-expanded={tradesOpen}
              aria-haspopup="true"
            >
              Trades <ChevronDown size={14} className={`transition-transform duration-200 ${tradesOpen ? 'rotate-180' : ''}`} />
            </button>
            {tradesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                {TRADES.map(t => (
                  <Link
                    key={t.slug}
                    href={`/${locale}/for/${t.slug}`}
                    onClick={() => setTradesOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#1E3A5F] transition-colors"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href={`/${locale}/pricing`} className="text-sm font-medium text-slate-600 hover:text-[#1E3A5F] transition-colors">
            Pricing
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isSignedIn ? (
            <Link href={`/${locale}/dashboard`}
              className="text-sm font-semibold bg-[#F97316] text-white px-4 py-2 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98]">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href={`/${locale}/sign-in`}
                className="text-sm font-semibold text-[#1E3A5F] border border-[#1E3A5F]/30 px-4 py-2 rounded-xl hover:border-[#1E3A5F] transition-all">
                Sign in
              </Link>
              <Link href={`/${locale}/sign-up`}
                className="text-sm font-semibold bg-[#F97316] text-white px-4 py-2 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98]">
                Start free trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-1 shadow-lg">
          <a href="#features" onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-slate-700">Features</a>

          {/* Mobile trades accordion */}
          <div>
            <button
              onClick={() => setMobileTradesOpen(o => !o)}
              className="flex items-center justify-between w-full py-2.5 text-sm font-medium text-slate-700"
            >
              Trades
              <ChevronDown size={14} className={`transition-transform duration-200 ${mobileTradesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileTradesOpen && (
              <div className="pl-4 pb-1 space-y-1">
                {TRADES.map(t => (
                  <Link
                    key={t.slug}
                    href={`/${locale}/for/${t.slug}`}
                    onClick={() => { setOpen(false); setMobileTradesOpen(false) }}
                    className="block py-2 text-sm text-slate-600"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href={`/${locale}/pricing`} onClick={() => setOpen(false)} className="block py-2.5 text-sm font-medium text-slate-700">Pricing</Link>

          <div className="pt-3 flex flex-col gap-2 border-t border-slate-100 mt-2">
            {!isSignedIn && (
              <Link href={`/${locale}/sign-in`} onClick={() => setOpen(false)}
                className="text-center text-sm font-semibold text-[#1E3A5F] border border-[#1E3A5F]/30 px-4 py-2.5 rounded-xl">
                Sign in
              </Link>
            )}
            <Link href={ctaHref} onClick={() => setOpen(false)}
              className="text-center text-sm font-semibold bg-[#F97316] text-white px-4 py-2.5 rounded-xl">
              {ctaLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
