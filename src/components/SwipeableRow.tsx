'use client'

import { useRef, useState } from 'react'
// LazyMotion + `m` is ~25kB smaller than the full `motion` import. We only
// need DOM animations here (drag + spring), so `domAnimation` is enough.
import { LazyMotion, domAnimation, m, useMotionValue, useTransform, animate } from 'framer-motion'

type Action = {
  label: string
  icon?: React.ReactNode
  color: string
  bg: string
  onClick: () => void
}

export function SwipeableRow({ children, actions, className = '' }: {
  children: React.ReactNode
  actions: Action[]
  className?: string
}) {
  const x = useMotionValue(0)
  const actionWidth = actions.length * 72
  const [swiped, setSwiped] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const actionsOpacity = useTransform(x, [-actionWidth, -20, 0], [1, 0.5, 0])

  function handleDragEnd(_: any, info: { offset: { x: number }; velocity: { x: number } }) {
    const shouldOpen = info.offset.x < -40 || info.velocity.x < -200
    if (shouldOpen) {
      animate(x, -actionWidth, { type: 'spring', stiffness: 400, damping: 30 })
      setSwiped(true)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      setSwiped(false)
    }
  }

  function close() {
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    setSwiped(false)
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
        {/* Action buttons behind */}
        <m.div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ opacity: actionsOpacity }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); close() }}
              className="w-[72px] flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors"
              style={{ background: action.bg, color: action.color }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </m.div>

        {/* Swipeable content */}
        <m.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: -actionWidth, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x, touchAction: 'pan-y' }}
          className="relative bg-white"
        >
          {children}
        </m.div>
      </div>
    </LazyMotion>
  )
}
