import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { siteConfig } from '@/lib/config'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'WorkPilot — Estimate, Invoice & Job Costing App for Contractors',
    template: '%s | WorkPilot',
  },
  description: siteConfig.description,
  keywords: [
    'contractor software',
    'contractor app',
    'estimate app for contractors',
    'invoicing software contractors',
    'job costing',
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
    title: 'WorkPilot — Estimate, Invoice & Job Costing App for Contractors',
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
    title: 'WorkPilot — Estimate, Invoice & Job Costing App for Contractors',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.className} h-full antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  )
}
