import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { CheckCircle2, ArrowRight, Wrench } from 'lucide-react'
import { PLANS } from '@/lib/stripe'
import { siteConfig } from '@/lib/config'
import { CheckoutButton } from './_components/CheckoutButton'
import { Navbar } from '@/app/[locale]/(marketing)/_components/Navbar'
import { Footer } from '@/app/[locale]/(marketing)/_components/Footer'

export const metadata: Metadata = {
  title: 'Pricing — WorkPilot Contractor Software',
  description:
    'Simple, flat-rate pricing for contractor software. One plan, everything included. No per-user fees. 14-day free trial — no credit card required.',
  alternates: { canonical: `${siteConfig.url}/en/pricing` },
}

const FAQ = [
  {
    q: 'Is there really no credit card required for the trial?',
    a: 'Correct. You get 14 days free with full access. No credit card until you decide to subscribe.',
  },
  {
    q: 'What happens when my trial ends?',
    a: "You'll be prompted to choose a plan. Your data is never deleted — you can pick up exactly where you left off.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings with one click. No cancellation fees, no questions asked.',
  },
  {
    q: 'Is there a per-user fee?',
    a: 'No. WorkPilot is flat-rate. Add your whole crew at no extra cost.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes — pay annually and save 20% (equivalent to 2 months free). Available at checkout.',
  },
]

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { userId } = await auth()
  const isSignedIn = !!userId

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} isSignedIn={isSignedIn} />

      <main className="pt-16">
        {/* Hero */}
        <section className="py-20 bg-[#F8FAFC]">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>
              Pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-4">
              Simple pricing.<br />No surprises.
            </h1>
            <p className="text-slate-500 text-lg">
              One plan. Everything included. No per-user fees. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing card */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Main card */}
              <div className="relative bg-white rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-slate-100 p-10">
                <div className="absolute -top-4 left-8">
                  <span className="bg-[#F97316] text-white text-xs font-bold px-5 py-1.5 rounded-full uppercase tracking-wide shadow-lg shadow-orange-500/30">
                    Most Popular
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-6 mt-2">
                  <div className="w-8 h-8 bg-[#1E3A5F] rounded-lg flex items-center justify-center">
                    <Wrench size={16} className="text-white" />
                  </div>
                  <span className="font-bold text-[#1E3A5F] text-xl">WorkPilot Pro</span>
                </div>

                <div className="mb-2">
                  <span className="text-6xl font-extrabold text-[#1E3A5F]">${PLANS.pro.price}</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                  or <span className="line-through">$588</span>{' '}
                  <span className="font-semibold text-green-600">$470/year — save 20%</span>
                </p>

                <div className="border-t border-slate-100 mb-6" />

                <ul className="space-y-3 mb-8">
                  {PLANS.pro.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-[#F97316] shrink-0" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <CheckoutButton locale={locale} />
                <p className="text-center text-xs text-slate-400 mt-3">
                  No credit card required for trial · Cancel anytime
                </p>
              </div>

              {/* What's included */}
              <div>
                <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">Everything you get</h2>
                <div className="space-y-4">
                  {[
                    { title: 'Unlimited estimates & invoices', desc: 'No caps. Quote and bill as many jobs as you want.' },
                    { title: 'Real-time job costing', desc: 'Know your margins before the job is done.' },
                    { title: 'Visual crew scheduling', desc: 'Assign jobs to your team in a drag-and-drop calendar.' },
                    { title: 'Mobile field app', desc: 'Your crew logs hours, photos and tasks from the field.' },
                    { title: 'Client management', desc: 'Full client history with jobs, estimates and invoices.' },
                    { title: 'Expense tracking', desc: 'Log every cost per job — materials, labor, subs.' },
                    { title: 'Email delivery', desc: 'Send estimates and invoices directly to clients.' },
                    { title: 'Priority support', desc: 'Real humans respond within 1 business day.' },
                  ].map(item => (
                    <div key={item.title} className="flex gap-3">
                      <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-[#F8FAFC] rounded-xl p-5 border border-slate-100">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-[#1E3A5F]">No per-user fees.</span>{' '}
                    Add your whole crew at no extra cost. Perfect for teams of 2–25 people.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-[#F8FAFC]">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-extrabold text-[#1E3A5F] mb-8 text-center">
              Pricing questions
            </h2>
            <div className="space-y-5">
              {FAQ.map(item => (
                <div key={item.q} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{item.q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="py-20"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Start your free trial today
            </h2>
            <p className="text-white/50 mb-8">14 days free. No credit card. Setup in 5 minutes.</p>
            <Link
              href={`/${locale}/sign-up`}
              className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/25"
            >
              Get started free <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
