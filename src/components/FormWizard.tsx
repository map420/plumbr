'use client'

import { useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'

type Step = {
  label: string
  content: React.ReactNode
  validate?: () => boolean
}

export function FormWizard({ steps, onComplete, onCancel, title, isPending }: {
  steps: Step[]
  onComplete: () => void
  onCancel: () => void
  title: string
  isPending?: boolean
}) {
  const [current, setCurrent] = useState(0)
  const isLast = current === steps.length - 1
  const isFirst = current === 0

  function next() {
    const step = steps[current]
    if (step.validate && !step.validate()) return
    if (isLast) { onComplete(); return }
    setCurrent(c => c + 1)
  }

  function back() {
    if (isFirst) { onCancel(); return }
    setCurrent(c => c - 1)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-4 py-2.5" style={{ borderBottom: '1px solid var(--wp-border-light)' }}>
        <div className="flex-1 flex items-center justify-start">
          <button type="button" onClick={back}
            className="flex items-center gap-0.5"
            style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            <ChevronLeft size={16} /> {isFirst ? 'Cancel' : 'Back'}
          </button>
        </div>
        <span className="flex-shrink-0" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--wp-text-primary)', lineHeight: '1.25rem' }}>
          {title}
        </span>
        <div className="flex-1 flex items-center justify-end">
          <button type="button" onClick={next} disabled={isPending}
            style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--wp-accent)', lineHeight: '1.25rem' }}>
            {isPending ? '...' : isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: 'var(--wp-bg-secondary)' }}>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{
                background: i < current ? 'var(--wp-success)' : i === current ? 'var(--wp-primary)' : 'var(--wp-bg-muted)',
                color: i <= current ? 'white' : 'var(--wp-text-muted)',
              }}
            >
              {i < current ? <Check size={11} /> : i + 1}
            </div>
            <span className="text-[10px] font-medium truncate" style={{ color: i === current ? 'var(--wp-text-primary)' : 'var(--wp-text-muted)' }}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px" style={{ background: i < current ? 'var(--wp-success)' : 'var(--wp-border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        {steps[current].content}
      </div>
    </div>
  )
}
