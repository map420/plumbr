import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/react'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { JsonLd } from '@/components/JsonLd'
import { siteConfig } from '@/lib/config'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'en' | 'es')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <ClerkProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <JsonLd />
        {children}
        <Analytics />
      </NextIntlClientProvider>
    </ClerkProvider>
  )
}
