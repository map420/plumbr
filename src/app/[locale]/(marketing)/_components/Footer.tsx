import Link from 'next/link'
import { Wrench } from 'lucide-react'

const TRADES = [
  { label: 'Plumbing contractors', slug: 'plumbers' },
  { label: 'Electricians', slug: 'electricians' },
  { label: 'Roofing contractors', slug: 'roofers' },
  { label: 'HVAC contractors', slug: 'hvac' },
  { label: 'General contractors', slug: 'general-contractors' },
  { label: 'Landscapers', slug: 'landscapers' },
  { label: 'Painters', slug: 'painters' },
  { label: 'Remodeling contractors', slug: 'remodelers' },
]

export function Footer({ locale }: { locale: string }) {
  return (
    <footer className="bg-[#0F2440] text-white/40">
      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                <Wrench size={14} className="text-white" />
              </div>
              <span className="text-xl font-extrabold text-white">WorkPilot</span>
            </Link>
            <p className="text-white/30 text-sm leading-relaxed mb-5">
              Run your contracting business like a pro. Built for contractors under $5M revenue.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/workpilot_app"
                aria-label="WorkPilot on X"
                rel="noopener noreferrer"
                target="_blank"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 text-xs font-bold"
              >
                𝕏
              </a>
              <a
                href="https://linkedin.com"
                aria-label="WorkPilot on LinkedIn"
                rel="noopener noreferrer"
                target="_blank"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 text-xs font-bold"
              >
                in
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={`/${locale}#features`} className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href={`/${locale}/pricing`} className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href={`/${locale}/sign-up`} className="hover:text-white transition-colors">Start free trial</Link></li>
              <li><Link href={`/${locale}/sign-in`} className="hover:text-white transition-colors">Sign in</Link></li>
            </ul>
          </div>

          {/* Trades */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">For contractors</h3>
            <ul className="space-y-2.5 text-sm">
              {TRADES.map(t => (
                <li key={t.slug}>
                  <Link href={`/${locale}/for/${t.slug}`} className="hover:text-white transition-colors">
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:hello@mrlabs.io" className="hover:text-white transition-colors">
                  Contact us
                </a>
              </li>
              <li>
                <a href="https://mrlabs.io" rel="noopener noreferrer" target="_blank" className="hover:text-white transition-colors">
                  Mr Labs
                </a>
              </li>
              <li><Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href={`/${locale}/terms`} className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <p>© {new Date().getFullYear()} WorkPilot. All rights reserved.</p>
          <p>
            Built by{' '}
            <a href="https://mrlabs.io" className="hover:text-white/40 transition-colors">Mr Labs</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
