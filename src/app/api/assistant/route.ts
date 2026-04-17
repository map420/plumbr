import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { dbAdapter } from '@/lib/adapters/db'
import { isPro } from '@/lib/stripe'
import { streamAssistant } from '@/lib/ai/assistant'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await dbAdapter.users.findById(userId)
  if (!isPro(user?.plan)) {
    return NextResponse.json({ error: 'AI Assistant is a Pro feature. Upgrade to access.' }, { status: 403 })
  }

  const { messages, model, voiceMode } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages array required' }, { status: 400 })
  }

  try {
    const stream = await streamAssistant(userId, messages, user?.companyName || undefined, model || 'auto', voiceMode || false, req.signal)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[AI Assistant] Error:', err.message)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
