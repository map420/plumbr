import type { Metadata } from 'next'
import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { getAllPosts } from '@/lib/blog'
import { siteConfig } from '@/lib/config'
import { Navbar } from '@/app/[locale]/(marketing)/_components/Navbar'
import { Footer } from '@/app/[locale]/(marketing)/_components/Footer'
import { NewsletterForm } from './_components/NewsletterForm'

export const metadata: Metadata = {
  title: 'Blog — WorkPilot Contractor Software',
  description:
    'Guides, tips and best practices for contractors. Learn how to estimate jobs, track costs, schedule crews and grow your contracting business.',
  alternates: { canonical: `${siteConfig.url}/en/blog` },
  keywords: ['contractor tips', 'construction business guide', 'contractor software blog', 'how to run a contracting business'],
}

// Blog content changes on a cadence of days/weeks, not per request. Revalidate
// hourly so the page is cached at the edge and only rebuilds when a post is
// actually added (or after 1h elapses).
export const revalidate = 3600

const CATEGORY_COLORS: Record<string, string> = {
  Estimating: 'bg-blue-100 text-blue-700',
  Finance: 'bg-green-100 text-green-700',
  'Getting Paid': 'bg-orange-100 text-orange-700',
  Software: 'bg-purple-100 text-purple-700',
  Operations: 'bg-slate-100 text-slate-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function BlogPage() {
  const locale = await getLocale()
  const posts = getAllPosts()
  const [featured, ...rest] = posts

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} />

      <main className="pt-16">
        {/* Header */}
        <section className="py-16 bg-[#F8FAFC]">
          <div className="max-w-5xl mx-auto px-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F97316] mb-3 block" style={{ letterSpacing: '0.08em' }}>
              Blog
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#1E3A5F] tracking-tight mb-3">
              Built for contractors.
            </h1>
            <p className="text-slate-500 text-lg">
              Guides on estimating, invoicing, job costing and growing your contracting business.
            </p>
          </div>
        </section>

        {/* Featured post */}
        <section className="py-12 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <Link
              href={`/${locale}/blog/${featured.slug}`}
              className="group block bg-[#F8FAFC] rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[featured.category] ?? 'bg-slate-100 text-slate-700'}`}>
                  {featured.category}
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(featured.publishedAt)}
                </span>
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <Clock size={12} /> {featured.readMinutes} min read
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#1E3A5F] mb-3 group-hover:text-[#F97316] transition-colors leading-tight">
                {featured.title}
              </h2>
              <p className="text-slate-500 leading-relaxed mb-4">{featured.excerpt}</p>
              <span className="inline-flex items-center gap-1 text-[#F97316] font-semibold text-sm">
                Read article <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </section>

        {/* Post grid */}
        <section className="pb-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-6">
              {rest.map(post => (
                <Link
                  key={post.slug}
                  href={`/${locale}/blog/${post.slug}`}
                  className="group bg-white rounded-2xl border border-slate-100 p-7 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] ?? 'bg-slate-100 text-slate-700'}`}>
                      {post.category}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock size={12} /> {post.readMinutes} min
                    </span>
                  </div>
                  <h2 className="font-bold text-[#1E3A5F] text-base mb-2 leading-snug group-hover:text-[#F97316] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[#F97316] font-semibold text-xs mt-4">
                    Read <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-[#F8FAFC] border-t border-slate-100">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-extrabold text-[#1E3A5F] mb-3">
              Tips for contractors, every week
            </h2>
            <p className="text-slate-500 mb-6">Estimating, invoicing, crew management and growth. No fluff.</p>
            <NewsletterForm />
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  )
}
