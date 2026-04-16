import Anthropic from '@anthropic-ai/sdk'
import { unstable_cache } from 'next/cache'
import { essentialTools } from './tools'
import { handleToolCall } from './tool-handlers'
import { aiContextTag } from '@/lib/cache-tags'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 0, // No retries — we handle fallback ourselves
})

const PRIMARY_MODEL = 'claude-sonnet-4-20250514'
const FALLBACK_MODEL = 'claude-haiku-4-5-20251001'

// Verbs that usually require tool use → start directly on Sonnet to avoid the
// Haiku→Sonnet double round-trip when the user asks for an action.
const ACTION_INTENT_RE = /\b(crea|crear|creo|envia|enviar|env[ií]o|pagar|pagué|pague|marca|marcar|elimina|eliminar|borra|actualiza|actualizar|cambia|cambiar|cobra|cobrar|send|create|delete|remove|update|mark|pay|charge|issue|assign)\b/i

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type StreamOpts = { signal?: AbortSignal }

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (err?.status === 429 && attempt < maxRetries) {
        const waitSec = Math.min(15 * (attempt + 1), 30)
        console.log(`[AI] Rate limited, waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}`)
        await sleep(waitSec * 1000)
        continue
      }
      throw err
    }
  }
  throw new Error('callWithRetry: unreachable')
}

async function callWithFallback(params: any, stream = false, fixedModel: string | null = null, opts: StreamOpts = {}) {
  const withSignal = (p: any) => ({ ...p, ...(opts.signal ? { signal: opts.signal } : {}) })

  if (fixedModel) {
    return callWithRetry(async () => {
      if (stream) return { result: anthropic.messages.stream({ ...params, model: fixedModel }, withSignal({})), model: fixedModel }
      return { result: await anthropic.messages.create({ ...params, model: fixedModel }, withSignal({})), model: fixedModel }
    })
  }

  try {
    return await callWithRetry(async () => {
      if (stream) return { result: anthropic.messages.stream({ ...params, model: PRIMARY_MODEL }, withSignal({})), model: PRIMARY_MODEL }
      return { result: await anthropic.messages.create({ ...params, model: PRIMARY_MODEL }, withSignal({})), model: PRIMARY_MODEL }
    })
  } catch (err: any) {
    console.log(`[AI] ${PRIMARY_MODEL} failed (${err?.status || err?.message}), falling back to ${FALLBACK_MODEL}`)
    return callWithRetry(async () => {
      if (stream) return { result: anthropic.messages.stream({ ...params, model: FALLBACK_MODEL }, withSignal({})), model: FALLBACK_MODEL }
      return { result: await anthropic.messages.create({ ...params, model: FALLBACK_MODEL }, withSignal({})), model: FALLBACK_MODEL }
    })
  }
}

const SYSTEM_PROMPT = `WorkPilot AI — contractor business copilot. Professional, concise. NEVER use emojis — no 🚨📊💰🎯📋✅ or any emoji. Use plain text only. Format: $X,XXX.XX. Tables for comparisons. ALWAYS respond in Spanish. Voice mode: 1-3 sentences, no tables/charts/buttons.

NEVER expose internal details to the user: no IDs, no "déjame buscar", no "voy a obtener los datos", no "basándome en el snapshot". Just show the answer directly as if you always had the data. Never mention tools, snapshots, IDs, or your internal process.

CRITICAL — TOOL USAGE: The SNAPSHOT below has jobs, estimates, invoices, clients, revenue data. ANSWER DIRECTLY from the snapshot for questions about counts, totals, status, analysis, recommendations. Do NOT call tools to re-fetch data that is already in the snapshot. ONLY call tools when you need to CREATE, UPDATE, SEND, or get specific detail not in the snapshot (e.g. line items of a specific estimate, expenses of a specific job, full client history).

Charts: \`\`\`chart {"type":"bar","title":"T","labels":["A"],"values":[5000]} \`\`\`

ENTITIES: Jobs (name+clientName required, status: lead→active→on_hold→completed→cancelled). Estimates (clientName+items required, types: labor/material/subcontractor/other, tax 10%, status: draft→sent→approved→converted). Invoices (clientName+items, dueDate suggest 30d, status: draft→sent→paid/overdue). Clients (name required). Expenses (jobId+description+type+amount). Technicians (name+email). Change/Work Orders (Pro, jobId required).

AUTOMATIONS: estimate sent→emails client+portal link. estimate approved→activates job. job completed→emails if draft invoice exists. invoice paid→notification.

FLOWS: Always search client first before creating. Guide step-by-step with buttons. For estimates: type→client→zone pricing→editable items→confirm. Keep items in memory until user confirms creation. Show table after each edit with old vs new total.

CONFIRMATION: L1 (direct): create drafts, update fields, read data. L2 (confirm first): send emails, mark paid, complete job, send estimate. For L2: explain consequences, show recipient, offer safer alternative.

CHAINS: List all actions before executing. Do L1 first, then confirm L2. Max 5 actions before pausing.

VALIDATION: Alert on low prices for zone, overloaded technicians, missing email. After creating estimate with new items, offer to save to catalog.

BUSINESS ADVISOR — When analyzing revenue, projections, or giving recommendations, consider these factors using INTERNAL DATA:
- Seasonality: compare current month revenue vs same month in prior data. Identify if this is historically a slow or strong month for this business.
- Client patterns: which clients generate repeat business? Who hasn't had a new job in 3+ months? Suggest re-engaging them.
- Conversion trends: how has win rate changed over recent months? Are estimates getting rejected more?
- Follow-up gaps: drafts sitting unsent, sent estimates without response 7+ days, overdue invoices without follow-up.
- Job completion rate: are jobs taking longer to complete? Slow completions delay invoicing.
- Pricing signals: compare average estimate value over time. If it's dropping, the contractor may be underpricing.
- Pipeline health: ratio of leads→active→completed. A healthy business has consistent flow at each stage.
- Cash flow timing: avg days to pay trending up means clients are paying slower — suggest adjusting payment terms or deposits.
When making recommendations, always tie them to specific data points: real client names, real estimate numbers, real amounts. Never give generic advice — every suggestion must reference something actionable in their data. The snapshot shows KPIs only — call tools (get_jobs, get_estimates, get_invoices, get_client_history) to look up the specific records you need before making data-driven recommendations.

ACTIONS — Syntax at END of message: {{ACTION:label|type|target}} Types: navigate (path) | send (message). Max 4 per response. EVERY response with a next step MUST have action buttons. Use real names/IDs/amounts. No actions in voice mode.

FORMATTING — Use standard markdown. The UI automatically styles it:
- ## headings become styled sections
- **bold** becomes emphasized text
- $amounts get highlighted automatically
- - bullet lists become styled list items
- 1. numbered lists become step indicators
- |tables| become styled data tables
Keep responses clean and structured with headings, bullets, and tables when showing data.

MATERIAL LISTS — When user asks for materials/shopping list for a specific job, output bullet list with prices (e.g. "- Cerámica 25m² - $450"). CRITICAL: if the list is for ONE specific job, call get_jobs first to get the UUID, then include marker at top of your response: <!-- job:THE_JOB_ID -->. The marker is invisible to the user and lets the system pre-link the job. If user didn't specify a job or it's ambiguous, OMIT the marker — the user will pick the job when saving.`

const VOICE_INSTRUCTIONS = '\n\nVOICE MODE IS ACTIVE. Keep responses to 1-3 sentences maximum. No tables, no charts, no markdown formatting. Be direct and conversational. Numbers should be spoken naturally (e.g. "four thousand dollars" not "$4,000.00"). Never say "WorkPilot" — say "tu negocio" or "your business" instead. Never say "contratista" or "contractor" — just say "tu negocio" or "your business". Keep it simple and natural.'

// Build the system blocks array. The static portion gets cache_control so
// Anthropic caches it for 5 minutes (90% discount on cached input tokens).
function buildSystemBlocks(staticText: string, dynamicContext: string) {
  return [
    { type: 'text' as const, text: staticText, cache_control: { type: 'ephemeral' as const } },
    { type: 'text' as const, text: dynamicContext },
  ]
}

// Mark the last tool with cache_control so tool definitions are cached too.
function buildCachedTools() {
  if (essentialTools.length === 0) return essentialTools
  const last = essentialTools[essentialTools.length - 1]
  return [
    ...essentialTools.slice(0, -1),
    { ...last, cache_control: { type: 'ephemeral' as const } },
  ]
}

const CACHED_TOOLS = buildCachedTools()

function maxTokensFor(model: string, voiceMode: boolean) {
  if (voiceMode) return 256
  if (model === FALLBACK_MODEL) return 512
  return 1024
}

// Fetch and format business context. Wrapped in unstable_cache per user (60s)
// so rapid-fire chat messages don't re-query the DB for every turn.
async function fetchPreloadContext(userId: string): Promise<string> {
  const { dbAdapter } = await import('@/lib/adapters/db')
  const { getAiPreferences } = await import('@/lib/actions/ai-preferences')

  // Fetch only what we need for KPI aggregation — no full table dumps.
  // Tools will fetch specific records on-demand when the user asks.
  const [jobs, estimates, invoices, clients, preferences] = await Promise.all([
    dbAdapter.jobs.findRecent(userId, 50),
    dbAdapter.estimates.findRecent(userId, 50),
    dbAdapter.invoices.findRecent(userId, 50),
    dbAdapter.clients.findAll(userId),
    getAiPreferences().catch(() => []),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── Job KPIs ──
  const leads = jobs.filter(j => j.status === 'lead')
  const activeJobs = jobs.filter(j => j.status === 'active')
  const completedJobs = jobs.filter(j => j.status === 'completed')
  const avgBudget = jobs.length > 0
    ? jobs.reduce((s, j) => s + parseFloat(j.budgetedCost as any || '0'), 0) / jobs.length : 0

  // ── Estimate KPIs ──
  const draftEst = estimates.filter(e => e.status === 'draft')
  const sentEst = estimates.filter(e => e.status === 'sent')
  const approvedEst = estimates.filter(e => ['approved', 'converted'].includes(e.status))
  const totalSentOrApproved = sentEst.length + approvedEst.length + estimates.filter(e => e.status === 'rejected').length
  const winRate = totalSentOrApproved > 0 ? Math.round((approvedEst.length / totalSentOrApproved) * 100) : null

  // ── Invoice KPIs ──
  const sentInv = invoices.filter(i => i.status === 'sent')
  const overdueInv = invoices.filter(i => i.status === 'overdue')
  const paidInv = invoices.filter(i => i.status === 'paid')
  const revenueThisMonth = paidInv
    .filter(i => i.paidAt && new Date(i.paidAt) >= monthStart)
    .reduce((s, i) => s + parseFloat(i.total), 0)
  const totalRevenue = paidInv.reduce((s, i) => s + parseFloat(i.total), 0)

  // ── Client KPIs (top 5 by invoice revenue) ──
  const clientRevenue: Record<string, { name: string; total: number }> = {}
  for (const inv of paidInv) {
    if (!clientRevenue[inv.clientName]) clientRevenue[inv.clientName] = { name: inv.clientName, total: 0 }
    clientRevenue[inv.clientName].total += parseFloat(inv.total)
  }
  const topClients = Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5)

  // ── Active jobs (names only — for personalized advice without full dump) ──
  const activeJobNames = activeJobs.slice(0, 5).map(j => `${j.name} (${j.clientName})`).join(', ')

  const snapshot = `SNAPSHOT (KPIs only — use tools to look up specific records):
Pipeline: ${leads.length} leads → ${activeJobs.length} active → ${completedJobs.length} completed | ${jobs.length} total${winRate !== null ? ` | Win rate: ${winRate}%` : ''}
Active jobs: ${activeJobNames || 'none'}
Avg job budget: $${avgBudget.toFixed(0)}
Estimates: ${draftEst.length} draft, ${sentEst.length} pending ($${sentEst.reduce((s, e) => s + parseFloat(e.total), 0).toFixed(0)}), ${approvedEst.length} approved
Invoices: ${sentInv.length} unpaid ($${sentInv.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(0)}), ${overdueInv.length} overdue ($${overdueInv.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(0)}), ${paidInv.length} paid
Revenue: $${revenueThisMonth.toFixed(0)} this month | $${totalRevenue.toFixed(0)} all-time
Clients: ${clients.length} total | Top: ${topClients.length > 0 ? topClients.map(c => `${c.name} ($${c.total.toFixed(0)})`).join(', ') : 'none yet'}`

  const prefsText = preferences.length > 0
    ? `\nPREFS: ${preferences.map(p => `${p.key}=${p.value}`).join(', ')}`
    : ''

  return `${snapshot}${prefsText}`
}

// Per-user cached preload. Tag-based invalidation from server actions that mutate data.
async function preloadContext(userId: string): Promise<string> {
  return unstable_cache(
    () => fetchPreloadContext(userId),
    ['ai-context', userId],
    { revalidate: 60, tags: [aiContextTag(userId)] }
  )()
}

function resolveInitialModel(
  modelPref: 'auto' | 'sonnet' | 'haiku',
  messages: { role: string; content: string }[]
): string {
  if (modelPref === 'sonnet') return PRIMARY_MODEL
  if (modelPref === 'haiku') return FALLBACK_MODEL
  // Auto: if the last user message suggests an action, skip Haiku and go
  // straight to Sonnet to avoid a second round-trip on tool_use.
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const lastText = typeof lastUser?.content === 'string' ? lastUser.content : ''
  if (lastText && ACTION_INTENT_RE.test(lastText)) return PRIMARY_MODEL
  return FALLBACK_MODEL
}

export async function streamAssistant(
  userId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  companyName?: string,
  modelPref: 'auto' | 'sonnet' | 'haiku' = 'auto',
  voiceMode = false,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  // Limit conversation history to save tokens
  const trimmedMessages = messages.slice(-10)
  const context = await preloadContext(userId)

  const staticText = [
    companyName ? `${SYSTEM_PROMPT}\n\nYou are assisting ${companyName}.` : SYSTEM_PROMPT,
    voiceMode ? VOICE_INSTRUCTIONS : '',
  ].filter(Boolean).join('')

  const systemBlocks = buildSystemBlocks(staticText, context)
  const resolvedModel = resolveInitialModel(modelPref, trimmedMessages)

  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        await processMessages(controller, encoder, systemBlocks, trimmedMessages, userId, 0, resolvedModel, voiceMode, signal)
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Client disconnected — nothing to report
          return
        }
        const is429 = err?.status === 429 || err.message?.includes('rate_limit') || err.message?.includes('429')
        const isOverloaded = err.message?.includes('Overloaded')

        if (is429) {
          controller.enqueue(encoder.encode('{{STATUS:Busy — retrying in a moment...}}'))
          await sleep(15000)
          try {
            await processMessages(controller, encoder, systemBlocks, trimmedMessages, userId, 0, resolvedModel, voiceMode, signal)
          } catch {
            controller.enqueue(encoder.encode('\n\nThe service is busy right now. Please try again in a minute.'))
          }
        } else if (!resolvedModel && isOverloaded) {
          try {
            controller.enqueue(encoder.encode(''))
            await processMessages(controller, encoder, systemBlocks, trimmedMessages, userId, 0, FALLBACK_MODEL, voiceMode, signal)
          } catch (retryErr: any) {
            controller.enqueue(encoder.encode(`\n\nError: ${retryErr.message}`))
          }
        } else {
          controller.enqueue(encoder.encode(`\n\nError: ${err.message}`))
        }
      } finally {
        controller.close()
      }
    },
  })
}

async function processMessages(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  systemBlocks: any[],
  messages: any[],
  userId: string,
  depth = 0,
  fixedModel: string | null = null,
  voiceMode = false,
  signal?: AbortSignal
) {
  if (depth > 3) {
    controller.enqueue(encoder.encode('I reached the maximum number of tool calls. Please try a simpler request.'))
    return
  }

  const model = fixedModel ?? FALLBACK_MODEL
  const max_tokens = maxTokensFor(model, voiceMode)

  const params: any = {
    max_tokens,
    system: systemBlocks,
    tools: CACHED_TOOLS,
    messages,
    stream: false,
  }

  const { result: response } = await callWithFallback(params, false, fixedModel, { signal })

  const toolBlocks = (response as Anthropic.Message).content.filter(b => b.type === 'tool_use')

  if (toolBlocks.length > 0) {
    // Escalate to Sonnet for tool processing (smarter model for complex actions)
    const toolModel = PRIMARY_MODEL

    const toolNames: Record<string, string> = {
      get_jobs: 'Looking up your jobs', get_estimates: 'Checking estimates',
      get_invoices: 'Reviewing invoices', get_clients: 'Searching clients',
      get_client_history: 'Getting client history', get_expenses: 'Checking expenses',
      get_dashboard_stats: 'Calculating business stats', get_technicians: 'Looking up your team',
      get_change_orders: 'Checking change orders', get_work_orders: 'Checking work orders',
      get_catalog_items: 'Looking up catalog', get_job_profitability: 'Analyzing profitability',
      get_overdue_invoices: 'Finding overdue invoices', get_pending_estimates: 'Finding pending estimates',
      create_job: 'Creating job', create_estimate: 'Creating estimate',
      create_invoice_from_estimate: 'Generating invoice', create_client: 'Adding client',
      create_expense: 'Logging expense', record_payment: 'Recording payment',
      update_job_status: 'Updating job', update_estimate_status: 'Updating estimate',
      send_estimate_email: 'Sending estimate', send_invoice_email: 'Sending invoice',
    }
    const statusMsg = toolBlocks.map(b => b.type === 'tool_use' ? (toolNames[b.name] || b.name) : '').filter(Boolean).join(', ')
    controller.enqueue(encoder.encode(`{{STATUS:${statusMsg}...}}`))

    const toolResults = (await Promise.all(
      toolBlocks.filter(b => b.type === 'tool_use').map(async (block) => {
        if (block.type !== 'tool_use') return null
        const result = await handleToolCall(userId, block.name, block.input as Record<string, any>)
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
      })
    )).filter(Boolean)

    const textBlock = (response as Anthropic.Message).content.find(b => b.type === 'text')
    if (textBlock && textBlock.type === 'text' && textBlock.text) {
      controller.enqueue(encoder.encode(textBlock.text))
    }

    const { result: stream } = await callWithFallback({
      max_tokens: maxTokensFor(toolModel, voiceMode),
      system: systemBlocks,
      tools: CACHED_TOOLS,
      messages: [
        ...messages,
        { role: 'assistant', content: (response as Anthropic.Message).content },
        { role: 'user', content: toolResults },
      ],
    }, true, toolModel, { signal })

    let hasToolUse = false

    for await (const event of stream as any) {
      if (signal?.aborted) return
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(event.delta.text))
      }
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        hasToolUse = true
      }
    }

    if (hasToolUse) {
      const finalMessage = await (stream as any).finalMessage()
      const newToolResults: any[] = []
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          const result = await handleToolCall(userId, block.name, block.input as Record<string, any>)
          newToolResults.push({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: result,
          })
        }
      }
      await processMessages(
        controller, encoder, systemBlocks,
        [
          ...messages,
          { role: 'assistant', content: (response as Anthropic.Message).content },
          { role: 'user', content: toolResults },
          { role: 'assistant', content: finalMessage.content },
          { role: 'user', content: newToolResults },
        ],
        userId, depth + 1, null, voiceMode, signal
      )
    }
  } else {
    // No tool calls — stream the response directly
    const streamParams: any = {
      max_tokens,
      system: systemBlocks,
      tools: CACHED_TOOLS,
      messages,
    }
    const { result: stream } = await callWithFallback(streamParams, true, fixedModel, { signal })

    for await (const event of stream as any) {
      if (signal?.aborted) return
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        controller.enqueue(encoder.encode(event.delta.text))
      }
    }
  }
}

// Keep non-streaming version for backwards compat
export async function runAssistant(
  userId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  companyName?: string
) {
  const context = await preloadContext(userId)
  const staticText = companyName
    ? `${SYSTEM_PROMPT}\n\nYou are assisting ${companyName}.`
    : SYSTEM_PROMPT
  const systemBlocks = buildSystemBlocks(staticText, context)

  const { result: response } = await callWithFallback({
    max_tokens: 1024,
    system: systemBlocks,
    tools: CACHED_TOOLS,
    messages,
  })

  let currentResponse = response as Anthropic.Message
  while (currentResponse.stop_reason === 'tool_use') {
    const toolResults: any[] = []
    for (const block of currentResponse.content) {
      if (block.type === 'tool_use') {
        const result = await handleToolCall(userId, block.name, block.input as Record<string, any>)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }
    }
    const { result: nextResponse } = await callWithFallback({
      max_tokens: 1024,
      system: systemBlocks,
      tools: CACHED_TOOLS,
      messages: [...messages, { role: 'assistant', content: currentResponse.content }, { role: 'user', content: toolResults }],
    })
    currentResponse = nextResponse as Anthropic.Message
  }

  const textBlock = currentResponse.content.find(b => b.type === 'text')
  return textBlock?.text ?? 'I couldn\'t process that request.'
}

// aiContextTag is exported from '@/lib/cache-tags' — import it there for
// server actions that mutate jobs/estimates/invoices/clients and call
// revalidateTag(aiContextTag(userId)).
