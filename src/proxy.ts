import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest } from 'next/server'

const intlMiddleware = createIntlMiddleware(routing)

const isPublicRoute = createRouteMatcher([
  '/',
  '/:locale',
  '/:locale/sign-in(.*)',
  '/:locale/sign-up(.*)',
  '/:locale/pricing',
  '/:locale/privacy',
  '/:locale/terms',
  '/:locale/portal(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (req.nextUrl.pathname.startsWith('/api/')) return
  if (!isPublicRoute(req)) await auth.protect()
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
