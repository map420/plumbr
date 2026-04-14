import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'

const base = siteConfig.url
const lastModified = new Date()

const trades = [
  'plumbing', 'electrical', 'hvac', 'roofing', 'general-contractor',
  'landscaping', 'painting', 'carpentry', 'flooring', 'drywall',
  'masonry', 'fencing', 'handyman', 'remodeling', 'insulation',
  'tiling', 'decking', 'windows-doors', 'plastering', 'residential-construction',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/en`, priority: 1.0, changeFrequency: 'weekly', lastModified },
    { url: `${base}/en/pricing`, priority: 0.9, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/features`, priority: 0.9, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/trades`, priority: 0.8, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/about`, priority: 0.7, changeFrequency: 'monthly', lastModified },
    { url: `${base}/en/blog`, priority: 0.8, changeFrequency: 'daily', lastModified },
    { url: `${base}/en/privacy`, priority: 0.3, changeFrequency: 'yearly', lastModified },
    { url: `${base}/en/terms`, priority: 0.3, changeFrequency: 'yearly', lastModified },
  ]

  const tradePages: MetadataRoute.Sitemap = trades.map(trade => ({
    url: `${base}/en/trades/${trade}`,
    priority: 0.8,
    changeFrequency: 'monthly',
    lastModified,
  }))

  return [...staticPages, ...tradePages]
}
