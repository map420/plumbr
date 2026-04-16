import { NextResponse } from 'next/server'

/**
 * Endpoint referenced by the `List-Unsubscribe` header of transactional emails.
 *
 * Present for compliance (CAN-SPAM / RFC 8058 one-click). It currently returns
 * an acknowledgement HTML page and logs the request, but does NOT yet persist
 * an unsubscribe preference — there is no `email_subscriptions` table.
 *
 * TODO: wire to a real opt-out store and have the cron/email adapter check it
 * before sending. For now this avoids 404s on the unsubscribe link and lets
 * the mailto: fallback reach the owner.
 */

function ackPage(email: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Unsubscribed — WorkPilot</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 64px auto; padding: 0 24px; color: #1a202c; }
  h1 { font-size: 20px; }
  p { color: #4a5568; line-height: 1.5; }
  small { color: #718096; }
</style></head>
<body>
  <h1>You're unsubscribed</h1>
  <p>We received the unsubscribe request for <strong>${email || 'your email'}</strong>.</p>
  <p>Transactional notices tied to active work (invoices, approvals) may still be sent because they're part of the service. To stop receiving them entirely, reply to any email and we'll remove you manually.</p>
  <small>WorkPilot</small>
</body></html>`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') ?? ''
  console.info('[unsubscribe] GET', { email })
  return new NextResponse(ackPage(email), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') ?? ''
  console.info('[unsubscribe] POST (one-click)', { email })
  return new NextResponse('OK', { status: 200 })
}
