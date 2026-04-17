'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const THRESHOLD = 60

export function PullToRefresh({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const isPulling = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current
    if (!el || el.scrollTop > 0 || refreshing) return
    startY.current = e.touches[0].clientY
    isPulling.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return
    const el = containerRef.current
    if (!el || el.scrollTop > 0) { isPulling.current = false; return }

    const diff = e.touches[0].clientY - startY.current
    if (diff < 0) { isPulling.current = false; return }

    const distance = Math.min(diff * 0.4, 100)
    setPullDistance(distance)
    setPulling(distance > 10)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return
    isPulling.current = false

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true)
      setPullDistance(THRESHOLD)
      router.refresh()
      setTimeout(() => {
        setRefreshing(false)
        setPullDistance(0)
        setPulling(false)
      }, 1000)
    } else {
      setPullDistance(0)
      setPulling(false)
    }
  }, [pullDistance, router])

  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pulling || refreshing) && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
          style={{ top: Math.max(pullDistance - 36, 4), transition: refreshing ? 'top 0.2s' : 'none' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white"
            style={{ boxShadow: 'var(--wp-shadow-md)', opacity: progress }}
          >
            <Loader2
              size={16}
              className={refreshing ? 'animate-spin' : ''}
              style={{
                color: 'var(--wp-primary)',
                transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
                transition: 'transform 0.1s',
              }}
            />
          </div>
        </div>
      )}

      {/* Content with pull offset */}
      <div style={{ transform: pulling || refreshing ? `translateY(${pullDistance}px)` : 'none', transition: refreshing || !pulling ? 'transform 0.2s' : 'none' }}>
        {children}
      </div>
    </div>
  )
}
