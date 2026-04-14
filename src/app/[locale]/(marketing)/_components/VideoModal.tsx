'use client'

import { useState } from 'react'
import { Play, X } from 'lucide-react'

export function VideoModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors group"
        aria-label="Watch 2-min demo"
      >
        <span className="w-9 h-9 rounded-full border border-white/30 flex items-center justify-center group-hover:border-white transition-colors bg-white/10">
          <Play size={14} className="text-white ml-0.5" fill="white" />
        </span>
        Watch 2-min demo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Demo video"
        >
          <div
            className="relative w-full max-w-3xl aspect-video bg-[#0F2440] rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            {/* Replace src with your actual YouTube/Loom embed URL */}
            <iframe
              src="about:blank"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="WorkPilot product demo"
            />
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm pointer-events-none">
              Add your demo video URL to VideoModal.tsx
            </div>
          </div>
        </div>
      )}
    </>
  )
}
