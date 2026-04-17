'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AudioLines, Square } from 'lucide-react'

type Status = 'idle' | 'connecting' | 'connected'

export function VoiceAssistant({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const convRef = useRef<any>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Cleanup on unmount
      if (convRef.current) {
        try { convRef.current.endSession() } catch {}
        convRef.current = null
      }
    }
  }, [])

  const startConversation = useCallback(async () => {
    if (status === 'connecting') return
    setStatus('connecting')
    setError(null)

    try {
      // Request mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mountedRef.current) return

      // Get signed URL
      const res = await fetch('/api/voice')
      const data = await res.json()
      if (!mountedRef.current) return
      if (!res.ok) throw new Error(data.error || 'Failed to get voice session')
      if (!data.signedUrl) throw new Error('No signed URL')
      console.log('[Voice] Got signed URL, connecting...')

      // Lazy load SDK only when needed
      const mod = await import('@elevenlabs/client')
      if (!mountedRef.current) return

      const conv = await mod.VoiceConversation.startSession({
        signedUrl: data.signedUrl,
        // Per-conversation overrides carry the user's business snapshot so we
        // no longer need to PATCH the shared agent prompt before every call.
        overrides: data.overrides,
        onConnect: () => {
          console.log('[Voice] Connected!')
          if (mountedRef.current) {
            setStatus('connected')
            setError(null)
          }
        },
        onDisconnect: (details: any) => {
          console.log('[Voice] Disconnected:', details)
          if (mountedRef.current) {
            convRef.current = null
            setStatus('idle')
            const msg = details?.message || details?.closeReason || details?.reason
            if (msg?.includes('quota')) {
              setError('ElevenLabs quota exceeded — check your plan at elevenlabs.io')
            } else if (msg) {
              setError(msg)
            }
          }
        },
        onError: (err: any) => {
          console.error('[Voice] Error:', err)
          if (mountedRef.current) {
            setError(typeof err === 'string' ? err : err?.message || 'Voice error')
            setStatus('idle')
          }
        },
        onModeChange: (mode: any) => {
          if (mountedRef.current) {
            setIsSpeaking(mode?.mode === 'speaking')
          }
        },
      })

      if (mountedRef.current) {
        convRef.current = conv
      } else {
        // Component unmounted during connection — clean up
        try { conv.endSession() } catch {}
      }
    } catch (err: any) {
      if (mountedRef.current) {
        console.error('Failed to start voice:', err)
        setError(err.message || 'Failed to connect')
        setStatus('idle')
      }
    }
  }, [status])

  const stopConversation = useCallback(async () => {
    if (convRef.current) {
      try { await convRef.current.endSession() } catch {}
      convRef.current = null
    }
    setStatus('idle')
    onClose()
  }, [onClose])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--wp-bg-secondary)' }}>
      <div className="flex-1 flex flex-col items-center justify-center py-10 px-6">
        <div className="relative w-28 h-28 flex items-center justify-center mb-6">
          {status === 'connected' && (
            <>
              <div className={`absolute inset-0 rounded-full border-2 ${isSpeaking ? 'animate-ping' : 'animate-pulse'}`} style={{ animationDuration: '1.5s', borderColor: isSpeaking ? 'var(--wp-accent)' : 'var(--wp-primary)' }} />
              <div className={`absolute inset-2 rounded-full border-2 ${isSpeaking ? 'animate-ping' : 'animate-pulse'}`} style={{ animationDuration: '2s', borderColor: isSpeaking ? 'var(--wp-accent)' : 'var(--wp-primary)', opacity: 0.4 }} />
            </>
          )}
          {status === 'connected' ? (
            <button onClick={stopConversation}
              className="relative z-10 w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg">
              <Square size={24} fill="white" />
            </button>
          ) : (
            <button onClick={startConversation} disabled={status === 'connecting'}
              className="relative z-10 w-20 h-20 rounded-full text-white flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
              style={{ background: 'var(--wp-primary)' }}>
              {status === 'connecting' ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <AudioLines size={28} />
              )}
            </button>
          )}
        </div>

        <p className="text-sm text-center" style={{ color: 'var(--wp-text-muted)' }}>
          {status === 'idle' && !error && 'Tap to start a voice conversation'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'connected' && !isSpeaking && 'Listening — speak naturally'}
          {status === 'connected' && isSpeaking && 'Speaking...'}
        </p>

        {error && (
          <p className="text-xs text-red-500 mt-2 text-center max-w-xs">{error}</p>
        )}
      </div>
    </div>
  )
}
