import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const MARKETING_URL = (process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://workpilot.mrlabs.io').trim()

// Root-or-locale-root pattern: "/", "/en", "/es", "/en/", "/es/"
const rootOrLocaleRoot = /^\/(?:(en|es)\/?)?$/

// Public routes that don't require auth. Root is NOT included — we handle it
// separately below so it can redirect based on auth state.
const isPublicRoute = createRouteMatcher([
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/:locale/pricing',
  '/:locale/privacy',
  '/:locale/terms',
  '/:locale/portal(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // API routes handle their own auth — still need clerkMiddleware running for
  // auth() to work in handlers.
  if (req.nextUrl.pathname.startsWith('/api/')) return

  const { userId } = await auth()
  const pathname = req.nextUrl.pathname

  // Root or locale-root: redirect based on auth state.
  //   unauth → marketing site (workpilot.mrlabs.io)
  //   authed → dashboard
  if (rootOrLocaleRoot.test(pathname)) {
    if (userId) {
      const locale = pathname.split('/')[1] || 'en'
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
    }
    return NextResponse.redirect(MARKETING_URL)
  }

  if (!isPublicRoute(req)) await auth.protect()
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
