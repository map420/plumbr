import { getLocale } from 'next-intl/server'
import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, X, FileText, BarChart2, Calendar,
  Smartphone, Users, Receipt, Star, Wrench,
} from 'lucide-react'
// Note: Wrench is used in the pricing section below
import { Navbar } from './_components/Navbar'
import { Footer } from './_components/Footer'
import { HeroDashboard } from './_components/HeroDashboard'
import { VideoModal } from './_components/VideoModal'
import { DemoTabs } from './_components/DemoTabs'
import { FaqAccordion } from './_components/FaqAccordion'
import { ScrollReveal } from './_components/ScrollReveal'
import { AnimatedCounter } from './_components/AnimatedCounter'

// Marketing page copy rarely changes. Revalidate hourly so Vercel caches the
// rendered HTML at the edge and the DB/Clerk calls in this page only run
// once per hour per locale instead of on every visit.
export const revalidate = 3600

export default async function LandingPage() {
  const locale = await getLocale()
  // CTA defaults to sign-up; the Navbar shows "Dashboard" instead when the
  // visitor is already signed in (resolved client-side via Clerk).
  const ctaHref = `/${locale}/sign-up`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} />

      <main>
        {/* ── [2] HERO ──────────────────────────────────────────────────────── */}
        <section
          className="relative min-h-[90vh] flex items-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          {/* Grain texture */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden>
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>

          <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
            <div className="grid lg:grid-cols-[60%_40%] gap-12 items-center">
              {/* Left */}
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-[#F97316]/15 border border-[#F97316]/30 text-[#F97316] text-sm font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase" style={{ letterSpacing: '0.05em' }}>
                  <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                  Trusted by{' '}
                  <AnimatedCounter target={500} suffix="+" />
                  {' '}contractors
                </div>

                <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
                  The contractor software<br />
                  <span className="text-[#F97316]">that runs your business.</span>
                </h1>

                <p className="text-lg md:text-xl text-white/60 max-w-xl mb-10 leading-relaxed">
                  Estimates, job costing, invoicing and crew scheduling — all in one app. Built for contractors under $5M revenue. No per-user fees.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
                  <Link
                    href={ctaHref}
                    className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl text-base hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25"
                  >
                    Start 14-day free trial <ArrowRight size={18} />
                  </Link>
                  <VideoModal />
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
                  {['No credit card required', 'Cancel anytime', 'Setup in 5 min'].map(t => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-green-400" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right — Dashboard mockup */}
              <div className="hidden lg:block">
                <HeroDashboard />
              </div>
            </div>
          </div>
        </section>

        {/* ── [3] SOCIAL PROOF BAR ─────────────────────────────────────────── */}
        <section className="bg-[#F8FAFC] border-y border-slate-100 py-10">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 mb-8">
              Trusted by contractors across the US
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14">
              {[
                { icon: '🔧', name: 'Rivera Plumbing Co.' },
                { icon: '⚡', name: 'Torres Electric' },
                { icon: '🏗️', name: 'BuildRight General' },
                { icon: '🏚️', name: 'Apex Roofing LLC' },
                { icon: '❄️', name: 'CoolAir HVAC' },
                { icon: '🪟', name: 'Panes & Sons' },
              ].map(co => (
                <div key={co.name} className="flex items-center gap-2 text-slate-500 font-semibold text-sm whitespace-nowrap">
                  <span className="grayscale opacity-60 text-base">{co.icon}</span>
                  <span>{co.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── [4] PROBLEMA → SOLUCIÓN ───────────────────────────────────────── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight">
                Stop juggling 5 different apps.
              </h2>
              <p className="text-slate-500 mt-4 text-lg max-w-xl mx-auto">
                Most contractors manage estimates in Excel, invoices in QuickBooks and crews via text. WorkPilot replaces all of them.
              </p>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* The old way */}
              <ScrollReveal delay={100}>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-8 h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-lg">😩</span>
                    <h3 className="font-bold text-red-700 text-base uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>The old way</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      'WhatsApp to communicate jobs',
                      'Excel to estimate costs',
                      'QuickBooks only for invoices',
                      'SMS to coordinate your crew',
                      'Paper & photos via iMessage',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-3">
                        <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                        <span className="text-red-800 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* With WorkPilot */}
              <ScrollReveal delay={200}>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-8 h-full">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-lg">✅</span>
                    <h3 className="font-bold text-green-700 text-base uppercase tracking-wide" style={{ letterSpacing: '0.05em' }}>With WorkPilot</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      'Everything in one place',
                      'Estimate in under 3 minutes',
                      'Invoice with 1 click',
                      'Crew scheduled visually',
                      'Photos & checklists from the field',
                    ].map(item => (
                      <div key={item} className="flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                        <span className="text-green-800 text-sm font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── [5] FEATURES ─────────────────────────────────────────────────── */}
        <section id="features" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>Features</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight">
                Contractor software features<br />built for the field.
              </h2>
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: FileText,
                  title: 'Estimates & Templates',
                  desc: 'Build estimates in minutes using cost templates. Convert to invoice in 1 click.',
                },
                {
                  icon: BarChart2,
                  title: 'Real-Time Job Costing',
                  desc: 'Know your margins before the job ends. Track budget vs actual in real time.',
                },
                {
                  icon: Calendar,
                  title: 'Visual Scheduling',
                  desc: 'Assign crews to jobs visually. No back-and-forth texts.',
                },
                {
                  icon: Smartphone,
                  title: 'Mobile Field App',
                  desc: 'Technicians upload photos and check off tasks from the job site.',
                },
                {
                  icon: Users,
                  title: 'Client Management',
                  desc: 'All your clients, their jobs, estimates and invoices — in one clean profile.',
                },
                {
                  icon: Receipt,
                  title: 'Expense Tracking',
                  desc: 'Log labor and materials per job. See exactly where your money goes.',
                },
              ].map((feat, i) => {
                const Icon = feat.icon
                return (
                  <ScrollReveal key={feat.title} delay={i * 80}>
                    <div className="group bg-white rounded-2xl p-7 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 h-full"
                      style={{ borderTop: '3px solid #F97316' }}>
                      <div className="w-11 h-11 bg-[#F97316]/10 rounded-xl flex items-center justify-center mb-5">
                        <Icon size={22} className="text-[#F97316]" />
                      </div>
                      <h3 className="font-bold text-[#1E3A5F] text-base mb-2">{feat.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                    </div>
                  </ScrollReveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── [6] DEMO ─────────────────────────────────────────────────────── */}
        <section
          className="py-24 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden>
            <filter id="noise2">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise2)" />
          </svg>
          <div className="relative max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>Product</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                See WorkPilot in action.
              </h2>
              <p className="text-white/50 text-lg">From estimate to paid invoice in under 10 minutes.</p>
            </ScrollReveal>
            <DemoTabs locale={locale} />
          </div>
        </section>

        {/* ── [7] TESTIMONIALS ─────────────────────────────────────────────── */}
        <section id="testimonials" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>Testimonials</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight">
                Contractors love WorkPilot.
              </h2>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  initials: 'CM',
                  name: 'Carlos M.',
                  company: 'Rivera Plumbing Co.',
                  location: 'Austin, TX',
                  quote: 'We went from losing track of invoices on WhatsApp to having everything organized in one week. Game changer.',
                },
                {
                  initials: 'JT',
                  name: 'Jennifer T.',
                  company: 'BuildRight General Contractors',
                  location: 'Phoenix, AZ',
                  quote: 'The job costing alone saved us $12k last quarter. I finally know which jobs are actually making money.',
                },
                {
                  initials: 'MD',
                  name: 'Mike D.',
                  company: 'Apex Roofing LLC',
                  location: 'Dallas, TX',
                  quote: 'My crew uses the field app every single day. No more photo folders lost in iMessage.',
                },
              ].map((t, i) => (
                <ScrollReveal key={t.name} delay={i * 100}>
                  <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-7 shadow-sm hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                    <div className="flex gap-0.5 mb-5">
                      {Array(5).fill(0).map((_, s) => (
                        <Star key={s} size={14} className="text-[#F97316] fill-[#F97316]" />
                      ))}
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-6">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {t.initials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                        <div className="text-slate-400 text-xs">{t.company} · {t.location}</div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── [8] PRICING ──────────────────────────────────────────────────── */}
        <section id="pricing" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>Pricing</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-4">
                Contractor software pricing.<br />Simple and flat-rate.
              </h2>
              <p className="text-slate-500 text-lg">One plan. Everything included. No per-user fees.</p>
            </ScrollReveal>

            <div className="flex justify-center">
              <ScrollReveal>
                <div className="relative bg-white rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-slate-100 p-10 w-full max-w-md">
                  {/* Badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[#F97316] text-white text-xs font-bold px-5 py-1.5 rounded-full uppercase tracking-wide shadow-lg shadow-orange-500/30">
                      Most Popular
                    </span>
                  </div>

                  <div className="text-center mb-8 mt-2">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Wrench size={18} className="text-[#1E3A5F]" />
                      <span className="font-bold text-[#1E3A5F] text-lg">WorkPilot Pro</span>
                    </div>
                    <div className="mt-4 mb-1">
                      <span className="text-6xl font-extrabold text-[#1E3A5F]">$49</span>
                      <span className="text-slate-400 text-lg">/month</span>
                    </div>
                    <div className="text-sm text-slate-400">or $470/year <span className="text-green-600 font-semibold">— save 20%</span></div>
                  </div>

                  <div className="border-t border-slate-100 mb-8" />

                  <div className="space-y-3 mb-8">
                    {[
                      'Unlimited estimates & invoices',
                      'Real-time job costing',
                      'Visual crew scheduling',
                      'Mobile field app',
                      'Client management',
                      'Expense tracking',
                      'Email delivery to clients',
                      'Priority support',
                    ].map(feature => (
                      <div key={feature} className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-[#F97316] shrink-0" />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={ctaHref}
                    className="block w-full text-center bg-[#F97316] text-white font-bold py-4 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-orange-500/20 text-base"
                  >
                    Start 14-day free trial
                  </Link>
                  <p className="text-center text-xs text-slate-400 mt-3">No credit card required · Cancel anytime</p>
                </div>
              </ScrollReveal>
            </div>

            <p className="text-center text-sm text-slate-400 mt-8">
              Have questions?{' '}
              <a href="mailto:hello@mrlabs.io" className="text-[#1E3A5F] font-semibold hover:underline">
                Talk to us →
              </a>
            </p>
          </div>
        </section>

        {/* ── [9] FAQ ──────────────────────────────────────────────────────── */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <ScrollReveal className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight">
                Frequently asked questions
              </h2>
            </ScrollReveal>
            <FaqAccordion />
          </div>
        </section>

        {/* ── [10] FINAL CTA ───────────────────────────────────────────────── */}
        <section
          className="py-28 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden>
            <filter id="noise3">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise3)" />
          </svg>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <ScrollReveal>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Your construction business,<br />
                <span className="text-[#F97316]">straight.</span>
              </h2>
              <p className="text-white/50 text-lg mb-10">
                Join 500+ contractors who stopped juggling tools.
              </p>
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-10 py-5 rounded-xl text-lg hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-500/25"
              >
                Start free trial — no credit card needed <ArrowRight size={20} />
              </Link>
              <p className="text-white/30 text-sm mt-4">Setup takes 5 minutes.</p>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
