import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { dbAdapter } from '@/lib/adapters/db'
import { checkRateLimit } from '@/lib/rate-limit'

const VOICE_DAILY_LIMIT = parseInt(process.env.VOICE_DAILY_LIMIT ?? '50', 10)

// Build a compact business snapshot for the voice agent. Uses findRecent
// (capped at 50 rows) so it stays under ElevenLabs' prompt size limit and
// doesn't get slow for contractors with years of history.
async function buildBusinessContext(userId: string) {
  const [jobs, estimates, invoices, clients, user] = await Promise.all([
    dbAdapter.jobs.findRecent(userId, 50),
    dbAdapter.estimates.findRecent(userId, 50),
    dbAdapter.invoices.findRecent(userId, 50),
    dbAdapter.clients.findAll(userId),
    dbAdapter.users.findById(userId),
  ])

  const activeJobs = jobs.filter(j => j.status === 'active')
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const pendingEstimates = estimates.filter(e => e.status === 'sent')
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const revenueThisMonth = invoices
    .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)

  const clientRevenue: Record<string, number> = {}
  invoices.filter(i => i.status === 'paid').forEach(i => {
    clientRevenue[i.clientName] = (clientRevenue[i.clientName] || 0) + parseFloat(i.total)
  })
  const topClients = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return `
BUSINESS DATA (use this to answer questions):
- Today: ${now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Company: ${user?.companyName || 'Not set'}
- Total jobs: ${jobs.length} (${activeJobs.length} active, ${jobs.filter(j => j.status === 'completed').length} completed)
- Active jobs: ${activeJobs.map(j => `${j.name} for ${j.clientName}`).join(', ') || 'none'}
- Clients: ${clients.length} total — ${clients.slice(0, 8).map(c => c.name).join(', ')}
- Estimates: ${estimates.length} total, ${pendingEstimates.length} pending worth $${pendingEstimates.reduce((s, e) => s + parseFloat(e.total), 0).toFixed(0)}
- Invoices: ${invoices.length} total, ${overdueInvoices.length} overdue worth $${overdueInvoices.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(0)}
- Revenue this month: $${revenueThisMonth.toFixed(0)}
- Top clients: ${topClients.map(([n, r]) => `${n} ($${r.toFixed(0)})`).join(', ') || 'none'}
- Recent estimates: ${estimates.slice(0, 5).map(e => `${e.number} for ${e.clientName}: $${parseFloat(e.total).toFixed(0)} (${e.status})`).join(', ')}
- Recent invoices: ${invoices.slice(0, 5).map(i => `${i.number} for ${i.clientName}: $${parseFloat(i.total).toFixed(0)} (${i.status})`).join(', ')}
`.trim()
}

const VOICE_AGENT_PROMPT_BASE = `You are a professional voice assistant for a contractor management business. You have access to real business data provided below.

Rules:
- Be concise: 1-3 sentences max per response
- Respond in the same language the user speaks (Spanish or English)
- Never say "WorkPilot" — say "tu negocio" or "your business"
- Use natural spoken numbers (e.g. "cuatro mil" not "$4,000")
- Go straight to the answer, no greetings
- If you don't have the data to answer, say so briefly`

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(userId, 'voice', VOICE_DAILY_LIMIT)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Daily voice limit reached. Try again later.', retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 })

  const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_8801kp698v0yeqdbbqpcyj4g3axy'

  // Fetch signed URL and business context in parallel. We no longer PATCH the
  // agent's global prompt per request — that was adding 400-800ms and caused
  // a race where two concurrent users could see each other's data. Instead we
  // return the context as an override that the client SDK applies per
  // conversation when calling startSession().
  const [signedUrlRes, businessContext] = await Promise.all([
    fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey }, signal: req.signal },
    ),
    buildBusinessContext(userId),
  ])

  const data = await signedUrlRes.json()
  if (!signedUrlRes.ok) {
    return NextResponse.json(
      { error: data.detail?.message || 'Failed to get signed URL' },
      { status: signedUrlRes.status },
    )
  }

  return NextResponse.json({
    signedUrl: data.signed_url,
    overrides: {
      agent: {
        prompt: { prompt: `${VOICE_AGENT_PROMPT_BASE}\n\n${businessContext}` },
        firstMessage: '¿En qué puedo ayudarte?',
        language: 'es',
      },
    },
  })
}
