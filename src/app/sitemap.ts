import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'
import { getAllTradeSlugs } from '@/lib/trades'
import { getAllPosts } from '@/lib/blog'

const base = siteConfig.url
const lastModified = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/en`, priority: 1.0, changeFrequency: 'weekly', lastModified },
    { url: `${base}/en/pricing`, priority: 0.9, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/features`, priority: 0.9, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/blog`, priority: 0.8, changeFrequency: 'weekly', lastModified },
    { url: `${base}/en/privacy`, priority: 0.3, changeFrequency: 'yearly', lastModified },
    { url: `${base}/en/terms`, priority: 0.3, changeFrequency: 'yearly', lastModified },
  ]

  const tradePages: MetadataRoute.Sitemap = getAllTradeSlugs().map(slug => ({
    url: `${base}/en/for/${slug}`,
    priority: 0.85,
    changeFrequency: 'monthly',
    lastModified,
  }))

  const blogPages: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${base}/en/blog/${post.slug}`,
    priority: 0.7,
    changeFrequency: 'yearly',
    lastModified: new Date(post.publishedAt),
  }))

  return [...staticPages, ...tradePages, ...blogPages]
}
