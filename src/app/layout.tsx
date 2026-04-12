import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Plumbr', template: '%s · Plumbr' },
  description: 'Your construction business, straight. Estimates, job costing, crew scheduling — all in one place.',
  keywords: ['construction management', 'contractor software', 'job costing', 'estimates', 'crew scheduling'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Plumbr',
    startupImage: '/icons/icon-512.png',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Plumbr',
    description: 'Your construction business, straight.',
    siteName: 'Plumbr',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full">
      <body className={`${inter.className} h-full antialiased bg-slate-50 text-slate-900`}>
        {children}
      </body>
    </html>
  )
}
