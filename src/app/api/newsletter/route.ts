import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (!RESEND_API_KEY || !AUDIENCE_ID) {
      console.error('[Newsletter] RESEND_API_KEY or RESEND_AUDIENCE_ID not set')
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        unsubscribed: false,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      console.error('[Newsletter] Resend error:', JSON.stringify(data))
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
