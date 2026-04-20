import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { siteConfig } from '@/lib/config'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'WorkPilot — Estimate, Invoice & Project Costing App for Contractors',
    template: '%s | WorkPilot',
  },
  description: siteConfig.description,
  keywords: [
    'contractor software',
    'contractor app',
    'estimate app for contractors',
    'invoicing software contractors',
    'project costing',
    'crew scheduling',
    'plumbing software',
    'construction management app',
    'contractor business app',
  ],
  authors: [{ name: 'WorkPilot', url: siteConfig.url }],
  creator: 'Mr Labs',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteConfig.url}/en`,
    siteName: siteConfig.name,
    title: 'WorkPilot — Estimate, Invoice & Project Costing App for Contractors',
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'WorkPilot — Contractor Business Management App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WorkPilot — Estimate, Invoice & Project Costing App for Contractors',
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitter,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WorkPilot',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

// Blocking script — se ejecuta sync antes del paint para evitar FOUC del tema.
// Lee localStorage y aplica `.dark` al <html> antes de que React hidrate.
// Usar suppressHydrationWarning en <html> porque la clase se añade antes del SSR → hydration.
const themeInitScript = `(function(){try{var t=localStorage.getItem('wp-theme')||'light';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;if(r==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} h-full antialiased`} style={{ background: 'var(--wp-bg-secondary)', color: 'var(--wp-text-primary)' }}>
        {children}
      </body>
    </html>
  )
}
