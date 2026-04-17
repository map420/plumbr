import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'
import { getAllTradeSlugs } from '@/lib/trades'
import { getAllPosts } from '@/lib/blog'

const base = siteConfig.url
const locales = ['en', 'es'] as const

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

function altLangs(path: string) {
  return Object.fromEntries(locales.map(l => [l, `${base}/${l}${path}`]))
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  // Static pages — one entry per locale with hreflang alternates so Google
  // knows the pages are translations of each other.
  for (const route of STATIC_ROUTES) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}${route.path}`,
        priority: route.priority,
        changeFrequency: route.changeFrequency,
        lastModified,
        alternates: { languages: altLangs(route.path) },
      })
    }
  }

  // Vertical landing pages (/for/<trade>)
  for (const slug of getAllTradeSlugs()) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/for/${slug}`,
        priority: 0.85,
        changeFrequency: 'monthly',
        lastModified,
        alternates: { languages: altLangs(`/for/${slug}`) },
      })
    }
  }

  // Blog posts — dynamic, surfaces new content to Google without a redeploy.
  for (const post of getAllPosts()) {
    const postLastMod = new Date(post.publishedAt)
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/blog/${post.slug}`,
        priority: 0.7,
        changeFrequency: 'yearly',
        lastModified: postLastMod,
        alternates: { languages: altLangs(`/blog/${post.slug}`) },
      })
    }
  }

  return entries
}
