import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getLocale } from 'next-intl/server'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import { getPost, getAllPosts } from '@/lib/blog'
import { siteConfig } from '@/lib/config'
import { Navbar } from '@/app/[locale]/(marketing)/_components/Navbar'
import { Footer } from '@/app/[locale]/(marketing)/_components/Footer'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const posts = getAllPosts()
  const locales = ['en', 'es']
  return locales.flatMap(locale => posts.map(p => ({ locale, slug: p.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    alternates: { canonical: `${siteConfig.url}/${locale}/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      url: `${siteConfig.url}/${locale}/blog/${slug}`,
      images: [
        {
          url: `${siteConfig.url}/api/og?title=${encodeURIComponent(post.title)}&subtitle=${encodeURIComponent(post.excerpt)}&tag=${encodeURIComponent(post.category)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const { userId } = await auth()
  const isSignedIn = !!userId
  const allPosts = getAllPosts().filter(p => p.slug !== slug).slice(0, 3)

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar locale={locale} isSignedIn={isSignedIn} />

      <main className="pt-16">
        {/* Article header */}
        <section className="py-12 bg-[#F8FAFC] border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-6">
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1E3A5F] mb-6 transition-colors"
            >
              <ArrowLeft size={14} /> Back to blog
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold bg-[#F97316]/10 text-[#F97316] px-2.5 py-1 rounded-full">
                {post.category}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Calendar size={12} /> {formatDate(post.publishedAt)}
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Clock size={12} /> {post.readMinutes} min read
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E3A5F] leading-tight mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">{post.excerpt}</p>

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-200">
              <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-sm font-bold">
                {post.author.initials}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{post.author.name}</div>
                <div className="text-slate-400 text-xs">{post.author.role}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Article body */}
        <section className="py-12 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <div
              className="prose prose-slate prose-lg max-w-none
                prose-headings:font-extrabold prose-headings:text-[#1E3A5F]
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-li:text-slate-600
                prose-strong:text-slate-900
                prose-a:text-[#F97316] prose-a:no-underline hover:prose-a:underline
                prose-table:text-sm prose-th:bg-[#F8FAFC] prose-th:font-semibold"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </section>

        {/* CTA banner */}
        <section className="py-12 bg-[#F8FAFC] border-y border-slate-100">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-[#1E3A5F] rounded-2xl p-8 text-center">
              <h2 className="text-2xl font-extrabold text-white mb-2">
                Try WorkPilot free for 14 days
              </h2>
              <p className="text-white/60 mb-6">Estimates, job costing, invoicing and crew scheduling — built for contractors.</p>
              <Link
                href={`/${locale}/sign-up`}
                className="inline-flex items-center gap-2 bg-[#F97316] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#ea6c0a] transition-colors"
              >
                Start free trial — no credit card
              </Link>
            </div>
          </div>
        </section>

        {/* Related posts */}
        {allPosts.length > 0 && (
          <section className="py-12 bg-white">
            <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-xl font-bold text-[#1E3A5F] mb-6">More from the blog</h2>
              <div className="space-y-4">
                {allPosts.map(p => (
                  <Link
                    key={p.slug}
                    href={`/${locale}/blog/${p.slug}`}
                    className="flex items-start gap-4 group p-4 rounded-xl hover:bg-[#F8FAFC] transition-colors"
                  >
                    <span className="text-xs font-semibold bg-[#F97316]/10 text-[#F97316] px-2.5 py-1 rounded-full mt-0.5 shrink-0">
                      {p.category}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm group-hover:text-[#F97316] transition-colors leading-snug">
                        {p.title}
                      </h3>
                      <span className="text-slate-400 text-xs">{p.readMinutes} min read</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer locale={locale} />
    </div>
  )
}
