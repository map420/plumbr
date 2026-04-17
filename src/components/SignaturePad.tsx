'use client'

import { useRef, useEffect, useCallback, useState } from 'react'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onClear: () => void
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const getPos = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1e293b'

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      setIsDrawing(true)
      setHasDrawn(true)
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!(e.target as HTMLElement)?.closest('canvas')) return
      const cvs = canvasRef.current
      if (!cvs) return
      // check drawing state via closure-free approach
      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const end = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      setIsDrawing(false)
    }

    // We need a ref-based drawing flag for event listeners
    let drawing = false

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing = true
      setHasDrawn(true)
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return
      e.preventDefault()
      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      drawing = false
    }

    canvas.addEventListener('mousedown', handleStart)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleEnd)
    canvas.addEventListener('mouseleave', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd)

    return () => {
      canvas.removeEventListener('mousedown', handleStart)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd)
      canvas.removeEventListener('mouseleave', handleEnd)
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
    }
  }, [getPos])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onClear()
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full max-w-[400px] h-auto border border-slate-200 rounded-xl bg-white cursor-crosshair touch-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasDrawn}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
