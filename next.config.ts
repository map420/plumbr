import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import withPWAInit from '@ducanh2912/next-pwa'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const withPWA = withPWAInit({
  dest: 'public',
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*\/_next\/static\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /^https?.*\/_next\/image\?/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-image',
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|ico)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-images',
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        urlPattern: /\.(?:woff2?|ttf|otf)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-fonts',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
      {
        urlPattern: /\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 5 },
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  experimental: {
    optimizePackageImports: [
      'recharts',
      'framer-motion',
      'lucide-react',
      '@elevenlabs/client',
      '@11labs/react',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'date-fns',
    ],
  },
  async redirects() {
    return [
      { source: '/jobs', destination: '/projects', permanent: true },
      { source: '/jobs/:path*', destination: '/projects/:path*', permanent: true },
      { source: '/:locale(en|es)/jobs', destination: '/:locale/projects', permanent: true },
      { source: '/:locale(en|es)/jobs/:path*', destination: '/:locale/projects/:path*', permanent: true },
      // Marketing CTAs point to ${appUrl}/login and /signup (generic, no locale).
      // Map those to the locale-prefixed Clerk sign-in / sign-up routes.
      { source: '/login', destination: '/en/sign-in', permanent: false },
      { source: '/login/:path*', destination: '/en/sign-in/:path*', permanent: false },
      { source: '/signup', destination: '/en/sign-up', permanent: false },
      { source: '/signup/:path*', destination: '/en/sign-up/:path*', permanent: false },
    ]
  },
}

export default withPWA(withNextIntl(nextConfig))
