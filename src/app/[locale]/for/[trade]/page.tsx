import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getLocale } from 'next-intl/server'
import { ArrowRight, CheckCircle2, Star, X } from 'lucide-react'
import { getTrade, getAllTradeSlugs } from '@/lib/trades'
import { siteConfig } from '@/lib/config'
import { Navbar } from '@/app/[locale]/(marketing)/_components/Navbar'
import { Footer } from '@/app/[locale]/(marketing)/_components/Footer'

type Props = { params: Promise<{ locale: string; trade: string }> }

export async function generateStaticParams() {
  const slugs = getAllTradeSlugs()
  const locales = ['en', 'es']
  return locales.flatMap(locale => slugs.map(trade => ({ locale, trade })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, trade: slug } = await params
  const trade = getTrade(slug)
  if (!trade) return {}
  return {
    title: trade.metaTitle,
    description: trade.metaDescription,
    keywords: trade.keywords,
    alternates: { canonical: `${siteConfig.url}/${locale}/for/${slug}` },
    openGraph: {
      title: trade.metaTitle,
      description: trade.metaDescription,
      url: `${siteConfig.url}/${locale}/for/${slug}`,
      images: [
        {
          url: `${siteConfig.url}/api/og?title=${encodeURIComponent(trade.metaTitle)}&subtitle=${encodeURIComponent(trade.metaDescription)}&tag=${encodeURIComponent(`For ${trade.namePlural}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export default async function TradePage({ params }: Props) {
  const { locale, trade: slug } = await params
  const trade = getTrade(slug)
  if (!trade) notFound()

  const { userId } = await auth()
  const isSignedIn = !!userId
  const ctaHref = isSignedIn ? `/${locale}/dashboard` : `/${locale}/sign-up`

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} isSignedIn={isSignedIn} />

      <main>
        {/* Hero */}
        <section
          className="relative min-h-[70vh] flex items-center overflow-hidden pt-16"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <div className="max-w-4xl mx-auto px-6 py-20 w-full text-center">
            <div className="inline-flex items-center gap-2 bg-[#F97316]/15 border border-[#F97316]/30 text-[#F97316] text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
              <span className="text-lg">{trade.icon}</span>
              Built for {trade.namePlural}
            </div>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              {trade.headline}
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              {trade.subheadline}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl text-base hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25"
              >
                Start free trial <ArrowRight size={18} />
              </Link>
              <span className="text-white/40 text-sm">No credit card required</span>
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Pains */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-8">
                <h2 className="text-lg font-bold text-red-700 mb-6 flex items-center gap-2">
                  <span>😩</span> Sound familiar?
                </h2>
                <div className="space-y-4">
                  {trade.pains.map(pain => (
                    <div key={pain} className="flex items-start gap-3">
                      <X size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <span className="text-red-800 text-sm leading-relaxed">{pain}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-green-50 border border-green-100 rounded-2xl p-8">
                <h2 className="text-lg font-bold text-green-700 mb-6 flex items-center gap-2">
                  <span>✅</span> With WorkPilot
                </h2>
                <div className="space-y-4">
                  {trade.benefits.map(benefit => (
                    <div key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-green-800 text-sm font-medium leading-relaxed">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 bg-[#F8FAFC]">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E3A5F] tracking-tight mb-3">
                Everything {trade.namePlural} need. Nothing they don&apos;t.
              </h2>
              <p className="text-slate-500">One flat price. No per-user fees. Cancel anytime.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { title: 'Fast Estimates', desc: `Build a ${trade.name.toLowerCase()} estimate with material and labor templates in under 3 minutes.` },
                { title: '1-Click Invoicing', desc: 'Convert any estimate to a professional invoice instantly. No double entry.' },
                { title: 'Job Costing', desc: 'Track budget vs actual costs in real time so you never finish a job without knowing your margin.' },
                { title: 'Crew Scheduling', desc: 'Assign your crew to jobs visually. Everyone knows where to be and what to do.' },
                { title: 'Field App', desc: 'Techs submit photos, check off tasks and log hours directly from their phone.' },
                { title: 'Client Management', desc: 'Every client\'s jobs, estimates and invoices in one organized profile.' },
              ].map(f => (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                  style={{ borderTop: '3px solid #F97316' }}
                >
                  <h3 className="font-bold text-[#1E3A5F] mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-20 bg-white">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <div className="flex justify-center gap-1 mb-6">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} size={20} className="text-[#F97316] fill-[#F97316]" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed mb-8">
              &ldquo;{trade.testimonial.quote}&rdquo;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold">
                {trade.testimonial.initials}
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-900">{trade.testimonial.name}</div>
                <div className="text-slate-400 text-sm">{trade.testimonial.company} · {trade.testimonial.location}</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          className="py-24"
          style={{ background: 'linear-gradient(135deg, #0F2440 0%, #1E3A5F 100%)' }}
        >
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to run your {trade.name.toLowerCase()} business like a pro?
            </h2>
            <p className="text-white/50 text-lg mb-10">
              Join 500+ contractors. Start your 14-day free trial — no credit card required.
            </p>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-10 py-5 rounded-xl text-lg hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] shadow-xl shadow-orange-500/25"
            >
              Start free trial <ArrowRight size={20} />
            </Link>
            <p className="text-white/30 text-sm mt-4">Setup in 5 minutes.</p>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
