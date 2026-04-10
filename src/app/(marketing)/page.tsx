import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

const features = [
  'Build estimates in minutes with cost templates',
  'Convert estimate to invoice in 1 click — no double entry',
  'Real-time job costing: know your margins before the job ends',
  'Visual crew scheduling with drag-and-drop',
  'Mobile field app for photos and task checklists',
]

const plans = [
  { name: 'Starter', price: 99, seats: '1–2 users', cta: 'Start free trial' },
  { name: 'Growth', price: 199, seats: '3–10 users', cta: 'Start free trial', featured: true },
  { name: 'Pro', price: 299, seats: '10–25 users', cta: 'Start free trial' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-[#1E3A5F]">Plumbr</span>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/sign-up" className="btn-primary text-sm">Start free trial</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          Built for contractors under $5M revenue
        </div>
        <h1 className="text-5xl font-bold text-[#1E3A5F] leading-tight mb-6">
          Your construction business,<br />
          <span className="text-[#F97316]">straight.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Stop juggling WhatsApp, Excel, and QuickBooks. Plumbr gives you estimates,
          job costing, crew scheduling, and invoicing — in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
            Start 14-day free trial <ArrowRight size={18} />
          </Link>
          <span className="text-sm text-slate-400">No credit card required</span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="max-w-xl mx-auto space-y-4">
            {features.map(f => (
              <div key={f} className="flex items-start gap-3">
                <CheckCircle size={20} className="text-[#F97316] mt-0.5 shrink-0" />
                <span className="text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-4">
            Flat-rate pricing. No per-user fees.
          </h2>
          <p className="text-center text-slate-500 mb-12">14-day free trial on all plans.</p>
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map(({ name, price, seats, cta, featured }) => (
              <div key={name} className={`rounded-xl border p-6 ${featured ? 'border-[#F97316] bg-orange-50 shadow-md' : 'border-slate-200 bg-white'}`}>
                {featured && <div className="text-xs font-bold text-[#F97316] uppercase tracking-wider mb-3">Most Popular</div>}
                <div className="text-lg font-bold text-slate-900 mb-1">{name}</div>
                <div className="text-3xl font-bold text-[#1E3A5F] mb-1">${price}<span className="text-base font-normal text-slate-400">/mo</span></div>
                <div className="text-sm text-slate-500 mb-6">{seats}</div>
                <Link href="/sign-up" className={`block text-center text-sm font-semibold py-2 rounded-lg transition-colors ${featured ? 'bg-[#F97316] text-white hover:bg-orange-600' : 'bg-[#1E3A5F] text-white hover:bg-blue-900'}`}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-slate-400">
          <span>© 2025 Plumbr. Built by Mr Labs.</span>
          <span>Your construction business, straight.</span>
        </div>
      </footer>
    </div>
  )
}
