'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const FAQS = [
  {
    q: 'Do I need a credit card to start the trial?',
    a: 'No. Just sign up with your email and you\'re in. No payment info required until you decide to subscribe.',
  },
  {
    q: 'What happens after the 14-day trial?',
    a: 'You choose to subscribe at $49/month or cancel — no charges happen automatically. We\'ll send you a reminder before the trial ends.',
  },
  {
    q: 'Is Plumbr only for plumbers?',
    a: 'Not at all. Plumbr works for any trade contractor: electricians, roofers, HVAC technicians, general contractors, landscapers, and more.',
  },
  {
    q: 'Can my field crew use it on their phones?',
    a: 'Yes. The mobile field app works on iOS and Android. Your technicians can upload photos, check off tasks, and log hours — all from the job site. No extra cost per user.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Most contractors are running their first estimate within 5 minutes of signing up. There\'s no complex onboarding or training required.',
  },
  {
    q: 'Does it integrate with QuickBooks?',
    a: 'Not yet, but it\'s on our roadmap. Plumbr handles estimates, invoicing, and job costing natively — most contractors find they no longer need QuickBooks for day-to-day operations.',
  },
]

export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-2xl overflow-hidden transition-all"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
            aria-expanded={open === i}
          >
            <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
              {open === i
                ? <Minus size={13} className="text-[#1E3A5F]" />
                : <Plus size={13} className="text-[#1E3A5F]" />
              }
            </span>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
