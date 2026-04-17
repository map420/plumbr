'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export type Message = { role: 'user' | 'assistant'; content: string }

const SESSION_KEY = 'wp-assistant-messages'

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveMessages(msgs: Message[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs)) } catch {}
}

export function useAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [statusText, setStatusText] = useState('')
  const [model, setModel] = useState<'auto' | 'sonnet' | 'haiku'>('auto')
  const [voiceMode, setVoiceMode] = useState(false)
  const [showVoiceCall, setShowVoiceCall] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef('')
  inputRef.current = input

  // Load persisted messages on mount
  useEffect(() => {
    setMessages(loadMessages())
  }, [])

  // Persist messages on change
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages)
  }, [messages])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, streamingText, scrollToBottom])

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  async function handleSend(directMessage?: string) {
    const msg = directMessage || input.trim()
    if (!msg || loading) return
    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)
    setStreamingText('')
    setStatusText('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model, voiceMode }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream available')

      const decoder = new TextDecoder()
      let fullText = ''
      let displayText = ''
      let buffer = ''
      let sentenceBuffer = ''

      const synth = window.speechSynthesis
      let maleVoice: SpeechSynthesisVoice | null = null
      if (voiceMode && ttsEnabled) {
        const voices = synth.getVoices()
        maleVoice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female'))
          || voices.find(v => v.lang.startsWith('es') && v.name.includes('Google'))
          || voices.find(v => v.lang.startsWith('es') && !v.name.toLowerCase().includes('female'))
          || voices.find(v => v.lang.startsWith('es'))
          || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male') && !v.name.toLowerCase().includes('female'))
          || voices[0] || null
      }

      function trySpeakSentence() {
        if (!voiceMode || !ttsEnabled || !maleVoice) return
        const sentenceEnd = sentenceBuffer.search(/[.!?]\s|[.!?]$|\n/)
        if (sentenceEnd >= 0) {
          const endIdx = sentenceEnd + 1
          const sentence = sentenceBuffer.slice(0, endIdx).trim()
          sentenceBuffer = sentenceBuffer.slice(endIdx)
          if (sentence && sentence.length > 2) {
            const clean = sentence.replace(/\*\*/g, '').replace(/\|/g, '').replace(/```[\s\S]*?```/g, '').trim()
            if (clean) {
              const utterance = new SpeechSynthesisUtterance(clean)
              utterance.rate = 1.05
              utterance.voice = maleVoice
              synth.speak(utterance)
              setIsSpeaking(true)
            }
          }
          trySpeakSentence()
        }
      }

      // Read stream — no typewriter, just accumulate and show status
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })

        const statusMatch = chunk.match(/\{\{STATUS:(.*?)\}\}/)
        if (statusMatch) {
          setStatusText(statusMatch[1])
          const cleanChunk = chunk.replace(/\{\{STATUS:.*?\}\}/g, '')
          if (cleanChunk) {
            fullText += cleanChunk
            sentenceBuffer += cleanChunk
            setStatusText('')
            trySpeakSentence()
          }
        } else {
          setStatusText('')
          fullText += chunk
          sentenceBuffer += chunk
          trySpeakSentence()
        }
      }

      // Voice: speak remaining text
      if (voiceMode && ttsEnabled && maleVoice && sentenceBuffer.trim()) {
        const clean = sentenceBuffer.replace(/\*\*/g, '').replace(/\|/g, '').replace(/```[\s\S]*?```/g, '').trim()
        if (clean) {
          const utterance = new SpeechSynthesisUtterance(clean)
          utterance.rate = 1.05
          utterance.voice = maleVoice
          utterance.onend = () => {
            setIsSpeaking(false)
            if (voiceMode) setTimeout(() => startListening(), 500)
          }
          synth.speak(utterance)
        } else {
          setIsSpeaking(false)
          if (voiceMode) setTimeout(() => startListening(), 500)
        }
      }

      // Add completed message (no streaming display — appears fully rendered)
      setStreamingText('')
      setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message)
      }
      setStreamingText('')
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    if (streamingText) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingText }])
      setStreamingText('')
    }
    setLoading(false)
  }

  function startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Speech recognition not supported in this browser'); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
      const current = inputRef.current
      if (current.trim()) {
        setTimeout(() => { handleSend() }, 200)
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') console.error('Speech error:', event.error)
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }

  function clearChat() {
    setMessages([])
    sessionStorage.removeItem(SESSION_KEY)
  }

  return {
    messages, input, setInput, loading, error, streamingText, statusText,
    model, setModel, voiceMode, setVoiceMode,
    showVoiceCall, setShowVoiceCall,
    isListening, isSpeaking, ttsEnabled, setTtsEnabled,
    handleSend, handleStop, startListening, stopListening, stopSpeaking,
    clearChat, scrollRef,
  }
}
