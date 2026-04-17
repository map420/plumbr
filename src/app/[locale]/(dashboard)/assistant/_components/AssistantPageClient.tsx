'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { ChevronLeft, Send, Loader2, Bot, AudioLines, Trash2, ArrowRight, AlertTriangle, Clock } from 'lucide-react'
import type { Alert } from '../page'
import { useAssistantChat } from '@/components/assistant/useAssistantChat'
import { renderContent, parseActions, ActionButtons, extractChecklist, type ActionBlock, type RenderContext } from '@/components/assistant/ChatRenderers'
import { RichChecklist } from '@/components/assistant/RichBlocks'
import { VoiceAssistant } from '@/components/VoiceAssistant'

const MODEL_LABELS = { auto: 'Auto', sonnet: 'Sonnet', haiku: 'Haiku' } as const
const QUICK_ACTIONS = [
  { icon: '📝', label: 'Create Estimate', subtitle: 'Guided pricing by zone and type of work. I fill the form for you.', shortcut: '/est', example: 'Estimate for a kitchen remodel in Queens...', message: 'I want to create an estimate. Help me choose the type of work and price it based on the client\'s location.' },
  { icon: '📊', label: 'Business Pulse', subtitle: 'Revenue, unpaid, pending estimates, red flags summary.', shortcut: '/pulse', example: 'How am I doing this month?', message: 'Give me a business summary for this month — revenue, overdue invoices, pending estimates, and any red flags.' },
  { icon: '💰', label: 'Follow Up', subtitle: 'Overdue invoices and stale estimates. I draft the messages.', shortcut: '/follow', example: 'Who owes me money this week?', message: 'What needs my attention? Show overdue invoices and stale estimates, and help me follow up.' },
  { icon: '📈', label: 'Margin Analysis', subtitle: 'Which jobs are losing money and what to do about it.', shortcut: '/margin', example: 'Analyze jobs from the last quarter', message: 'Analyze my job profitability. Which jobs are losing money and what can I do about it?' },
  { icon: '🛒', label: 'Shopping List', subtitle: 'Materials for the week grouped by supplier and route.', shortcut: '/shop', example: 'Materials for this week\'s jobs', message: 'Prepare a materials shopping list for all my jobs this week, grouped by supplier.' },
  { icon: '✉️', label: 'Draft Message', subtitle: 'SMS, email or reminder personalized for a client.', shortcut: '/draft', example: 'Gentle reminder to Linda Chen about INV-232', message: 'Help me draft a message to a client. Ask me which client, the purpose, and suggested tone.' },
]

const SUGGESTION_PILLS = [
  { emoji: '📊', text: 'How am I doing this month?', message: 'Give me a business summary for this month — revenue, overdue invoices, pending estimates, and any red flags.' },
  { emoji: '📝', text: 'Create estimate for a new client', message: 'I want to create an estimate for a new client. Guide me through the process.' },
  { emoji: '💰', text: 'Send reminders to overdue invoices', message: 'What invoices are overdue? Help me send reminders.' },
  { emoji: '⚙️', text: 'My least profitable job this week', message: 'Which of my current jobs has the worst margin this week?' },
]

function ModelSelector({ model, setModel }: { model: keyof typeof MODEL_LABELS; setModel: (m: any) => void }) {
  return (
    <div className="flex items-center rounded-full overflow-hidden" style={{ border: '1px solid var(--wp-border)' }}>
      {(['auto', 'sonnet', 'haiku'] as const).map(m => (
        <button key={m} onClick={() => setModel(m)}
          className="text-[11px] px-3 py-1 font-medium transition-colors"
          style={{
            background: model === m ? 'var(--wp-primary)' : 'transparent',
            color: model === m ? 'white' : 'var(--wp-text-muted)',
          }}>
          {MODEL_LABELS[m]}
        </button>
      ))}
    </div>
  )
}

function InputBar({ chat, onVoice }: { chat: ReturnType<typeof useAssistantChat>; onVoice?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full px-1" style={{ background: 'var(--wp-bg-muted)' }}>
      <input
        type="text"
        value={chat.input}
        onChange={e => chat.setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat.handleSend() } }}
        placeholder="Ask something..."
        disabled={chat.loading}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50"
        style={{ color: 'var(--wp-text-primary)' }}
      />
      {onVoice && !chat.loading && !chat.input.trim() && (
        <button onClick={onVoice}
          className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors"
          style={{ color: 'var(--wp-text-muted)' }} title="Voice mode">
          <AudioLines size={18} />
        </button>
      )}
      {chat.loading ? (
        <button onClick={chat.handleStop}
          className="w-8 h-8 flex items-center justify-center text-white rounded-full transition-colors shrink-0 mr-0.5"
          style={{ background: 'var(--wp-text-muted)' }} title="Stop">
          <div className="w-3 h-3 rounded-sm bg-white" />
        </button>
      ) : (
        <button onClick={() => chat.handleSend()} disabled={!chat.input.trim()}
          className="w-8 h-8 flex items-center justify-center text-white rounded-full disabled:opacity-30 transition-colors shrink-0 mr-0.5"
          style={{ background: 'var(--wp-accent)' }}>
          <Send size={14} />
        </button>
      )}
    </div>
  )
}

const ALERT_ICONS = { overdue: AlertTriangle, stale: Clock, inactive: Clock }

export function AssistantPageClient({ alerts = [] }: { alerts?: Alert[] }) {
  const router = useRouter()
  const locale = useLocale()
  const searchParams = useSearchParams()
  const chat = useAssistantChat()
  const [autoSent, setAutoSent] = useState(false)

  // Auto-send message from URL query param (e.g. from dashboard "Ask AI" button)
  useEffect(() => {
    const msg = searchParams.get('msg')
    if (msg && !autoSent && chat.messages.length === 0) {
      setAutoSent(true)
      chat.handleSend(msg)
    }
  }, [searchParams, autoSent, chat.messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAction(action: ActionBlock) {
    if (action.type === 'navigate') {
      router.push(`/${locale}${action.target}`)
    } else if (action.type === 'send') {
      chat.handleSend(action.target)
    }
  }

  if (chat.showVoiceCall) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>
        <div className="flex items-center px-4 py-3 md:hidden text-white" style={{ background: 'var(--wp-primary)' }}>
          <div className="flex-1">
            <button onClick={() => chat.setShowVoiceCall(false)}
              className="flex items-center gap-0.5"
              style={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: '1.25rem' }}>
              <ChevronLeft size={16} /> Chat
            </button>
          </div>
          <span className="text-sm font-semibold">Voice Mode</span>
          <div className="flex-1" />
        </div>
        <div className="flex-1 flex flex-col" style={{ background: 'var(--wp-bg-secondary)' }}>
          <VoiceAssistant onClose={() => chat.setShowVoiceCall(false)} />
        </div>
      </div>
    )
  }

  const hasMessages = chat.messages.length > 0 || chat.loading

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 4rem)' }}>

      {/* ── MOBILE HEADER ── */}
      <div className="md:hidden flex items-center px-4 py-2.5 text-white" style={{ background: 'var(--wp-primary)' }}>
        <div className="flex-1 flex items-center">
          <button onClick={() => router.back()} className="flex items-center" style={{ lineHeight: '1.25rem' }}>
            <ChevronLeft size={18} />
          </button>
        </div>
        <span className="text-sm font-semibold" style={{ lineHeight: '1.25rem' }}>WorkPilot AI</span>
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {chat.messages.length > 0 && (
            <button onClick={chat.clearChat} className="p-1 text-white/50" title="Clear"><Trash2 size={15} /></button>
          )}
        </div>
      </div>

      {/* ── MOBILE: model selector ── */}
      <div className="md:hidden flex items-center justify-center py-2" style={{ background: 'var(--wp-bg-secondary)' }}>
        <ModelSelector model={chat.model} setModel={chat.setModel} />
      </div>

      {/* ── DESKTOP HEADER ── */}
      <div className="hidden md:flex items-center px-6 py-2.5" style={{ background: 'var(--wp-bg-primary)', borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--wp-brand)' }}>
              <Bot size={16} style={{ color: 'var(--wp-ai-accent, #A5B4FC)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--wp-text-primary)' }}>WorkPilot AI</span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'var(--wp-text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }} />
              Connected
            </span>
          </div>
        </div>
        <ModelSelector model={chat.model} setModel={chat.setModel} />
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {chat.messages.length > 0 && (
            <button onClick={chat.clearChat} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--wp-text-muted)' }} title="New chat">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE EMPTY STATE (replaces scroll area when no messages) ── */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col md:hidden" style={{ background: 'var(--wp-bg-secondary)' }}>
          {/* Alert banners */}
          {alerts.length > 0 && (
            <div className="px-4 pt-3 space-y-1.5">
              {alerts.map((alert, i) => {
                const Icon = ALERT_ICONS[alert.type]
                return (
                  <button key={i} onClick={() => chat.handleSend(alert.message)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium"
                    style={{ background: alert.type === 'overdue' ? 'var(--wp-error-bg)' : 'var(--wp-warning-bg)', color: alert.type === 'overdue' ? 'var(--wp-error)' : 'var(--wp-warning)' }}>
                    <Icon size={14} className="shrink-0" />
                    {alert.label}
                  </button>
                )
              })}
            </div>
          )}
          {/* Centered icon + text */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'var(--wp-bg-muted)' }}>
              <Bot size={28} style={{ color: 'var(--wp-text-muted)' }} />
            </div>
            <p className="text-lg font-semibold mb-1" style={{ color: 'var(--wp-text-primary)' }}>How can I help you today?</p>
            <p className="text-sm text-center" style={{ color: 'var(--wp-text-muted)' }}>Ask about your business, create documents, or get insights.</p>
          </div>
          {/* Quick actions pinned above input — horizontal scroll */}
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {QUICK_ACTIONS.map(action => (
              <button key={action.label}
                onClick={() => chat.handleSend(action.message)}
                className="shrink-0 text-left px-3 py-2 rounded-xl transition-all"
                style={{ background: 'var(--wp-bg-primary)', border: '1px solid var(--wp-border)', color: 'var(--wp-text-secondary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--wp-text-primary)' }}>{action.label}</p>
                <p className="text-[10px] leading-tight" style={{ color: 'var(--wp-text-muted)' }}>{action.subtitle}</p>
              </button>
            ))}
          </div>
          {/* Input */}
          <div style={{ background: 'var(--wp-bg-primary)', borderTop: '1px solid var(--wp-border-light)' }}>
            <div className="px-4 py-2.5">
              <InputBar chat={chat} onVoice={() => chat.setShowVoiceCall(true)} />
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP EMPTY STATE ── */}
      {!hasMessages && (
        <div className="hidden md:flex flex-1 flex-col items-center overflow-y-auto" style={{ background: 'var(--wp-bg-secondary)' }}>
          <div className="w-full max-w-[720px] mx-auto flex flex-col items-center pt-12 pb-8 px-4">
            {/* Logo + greeting */}
            <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ background: 'var(--wp-brand)', color: 'var(--wp-ai-accent, #A5B4FC)' }}>
              <Bot size={28} />
            </div>
            <p className="text-xl font-bold mb-1" style={{ color: 'var(--wp-text-primary)', letterSpacing: '-0.02em' }}>
              {locale === 'es' ? 'Hola, soy WorkPilot AI' : 'Hi, I\'m WorkPilot AI'}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--wp-text-muted)' }}>
              {locale === 'es' ? 'Tu copiloto para gestionar el negocio. Pregúntame lo que sea...' : 'Your copilot for managing the business. Ask me anything...'}
            </p>

            {/* Alert banners */}
            {alerts.length > 0 && (
              <div className="w-full mb-6 space-y-2">
                {alerts.map((alert, i) => {
                  const Icon = ALERT_ICONS[alert.type]
                  return (
                    <button key={i} onClick={() => chat.handleSend(alert.message)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors hover:opacity-90"
                      style={{ background: alert.type === 'overdue' ? 'var(--wp-error-bg)' : 'var(--wp-warning-bg)', color: alert.type === 'overdue' ? 'var(--wp-error)' : 'var(--wp-warning)' }}>
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1">{alert.label}</span>
                      <ArrowRight size={14} className="shrink-0 opacity-60" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Use case grid 2×3 */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              {QUICK_ACTIONS.map(action => (
                <button key={action.label}
                  onClick={() => chat.handleSend(action.message)}
                  className="text-left px-4 py-4 rounded-xl transition-all hover:-translate-y-px"
                  style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', boxShadow: 'var(--wp-elevation-1)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--wp-brand)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--wp-border-v2)')}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{action.icon}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--wp-text)' }}>{action.label}</span>
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded ml-auto"
                      style={{ background: 'var(--wp-surface-2)', color: 'var(--wp-text-3)', border: '1px solid var(--wp-border-v2)' }}>
                      {action.shortcut}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: 'var(--wp-text-3)' }}>{action.subtitle}</p>
                  <p className="text-[10px] italic" style={{ color: 'var(--wp-text-3)', opacity: 0.7 }}>&ldquo;{action.example}&rdquo;</p>
                </button>
              ))}
            </div>

            {/* Suggestion pills */}
            <div className="w-full flex flex-wrap gap-2 mb-6 justify-center">
              {SUGGESTION_PILLS.map((pill, i) => (
                <button key={i} onClick={() => chat.handleSend(pill.message)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-colors hover:border-[color:var(--wp-brand)]"
                  style={{ background: 'var(--wp-surface)', border: '1px solid var(--wp-border-v2)', color: 'var(--wp-text-2)' }}>
                  <span>{pill.emoji}</span> {pill.text}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="w-full max-w-lg">
              <InputBar chat={chat} onVoice={() => chat.setShowVoiceCall(true)} />
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES (scroll area, only when has messages) ── */}
      {hasMessages && (
        <>
          <div ref={chat.scrollRef} className="flex-1 overflow-y-auto" style={{ background: 'var(--wp-bg-secondary)' }}>
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {chat.messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && i === chat.messages.length - 1
                const { cleanText, actions } = msg.role === 'assistant' ? parseActions(msg.content) : { cleanText: msg.content, actions: [] }
                const showActions = isLastAssistant && actions.length > 0 && !chat.loading

                // JobId is resolved per-message via AI marker <!-- job:id --> in extractChecklist.
                const renderCtx: RenderContext = {}
                const checklist = msg.role === 'assistant' ? extractChecklist(msg.content, renderCtx) : null

                return (
                  <div key={i}>
                    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                        style={msg.role === 'user'
                          ? { background: 'var(--wp-primary)', color: 'white' }
                          : { background: 'var(--wp-bg-primary)', color: 'var(--wp-text-secondary)', boxShadow: 'var(--wp-shadow-xs)' }
                        }>
                        {msg.role === 'assistant' ? renderContent(cleanText, renderCtx) : <div className="whitespace-pre-wrap">{msg.content}</div>}
                        {showActions && <ActionButtons actions={actions} onAction={handleAction} />}
                      </div>
                    </div>
                    {checklist && (
                      <div className="mt-2">
                        <RichChecklist
                          jobId={checklist.jobId}
                          jobResolved={checklist.jobResolved}
                          items={checklist.items}
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {chat.loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--wp-bg-primary)', boxShadow: 'var(--wp-shadow-xs)' }}>
                    <Loader2 size={14} className="animate-spin" style={{ color: 'var(--wp-text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--wp-text-muted)' }}>{chat.statusText || 'Thinking...'}</span>
                  </div>
                </div>
              )}

              {chat.error && (
                <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{chat.error}</div>
              )}
            </div>
          </div>

          {/* Bottom input when has messages */}
          <div style={{ background: 'var(--wp-bg-primary)', borderTop: '1px solid var(--wp-border-light)' }}>
            <div className="max-w-2xl mx-auto px-4 py-2.5">
              <InputBar chat={chat} onVoice={() => chat.setShowVoiceCall(true)} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
