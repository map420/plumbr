'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText, BarChart2, Calendar, ArrowRight } from 'lucide-react'

const TABS = [
  {
    id: 'estimates',
    label: 'Estimates',
    icon: FileText,
    mockup: <EstimatesMockup />,
  },
  {
    id: 'costing',
    label: 'Job Costing',
    icon: BarChart2,
    mockup: <CostingMockup />,
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    mockup: <SchedulingMockup />,
  },
]

function EstimatesMockup() {
  return (
    <div className="bg-[#0a1929] rounded-xl p-4 font-mono text-xs space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-2 text-slate-500 text-[11px]">plumbr.mrlabs.io/en/estimates/new</span>
      </div>
      <div className="bg-white/5 rounded-lg p-3 space-y-2">
        <div className="text-slate-400 text-[11px] uppercase tracking-wider mb-2">New Estimate — EST-042</div>
        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
          <span className="text-white/70">Electrician labor (8h)</span>
          <span className="text-[#F97316] font-semibold">$600.00</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
          <span className="text-white/70">Wiring & conduit</span>
          <span className="text-[#F97316] font-semibold">$220.00</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
          <span className="text-white/70">Panel upgrade</span>
          <span className="text-[#F97316] font-semibold">$850.00</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-white font-bold">Total</span>
          <span className="text-green-400 font-bold text-base">$1,834.00</span>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <div className="flex-1 bg-[#F97316] text-white text-center py-2 rounded-lg text-[11px] font-bold">Send to Client →</div>
        <div className="flex-1 bg-white/5 text-white/60 text-center py-2 rounded-lg text-[11px]">Convert to Invoice</div>
      </div>
    </div>
  )
}

function CostingMockup() {
  const bars = [
    { label: 'Labor', budget: 80, actual: 72, ok: true },
    { label: 'Materials', budget: 60, actual: 68, ok: false },
    { label: 'Subcontract', budget: 40, actual: 35, ok: true },
  ]
  return (
    <div className="bg-[#0a1929] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-2 text-slate-500 text-[11px]">Job Costing — Downtown Reno</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Margin', value: '34%', color: 'text-green-400' },
          { label: 'Budget', value: '$12,400', color: 'text-white' },
          { label: 'Actual', value: '$8,180', color: 'text-[#F97316]' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 rounded-lg p-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>{b.label}</span>
              <span className={b.ok ? 'text-green-400' : 'text-red-400'}>{b.ok ? '✓ On budget' : '⚠ Over budget'}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${b.ok ? 'bg-green-400' : 'bg-red-400'}`}
                style={{ width: `${b.actual}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SchedulingMockup() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const jobs = [
    { day: 0, span: 2, name: 'Rivera — Plumbing', color: 'bg-blue-500' },
    { day: 1, span: 1, name: 'Apex — Roofing', color: 'bg-purple-500' },
    { day: 2, span: 2, name: 'BuildRight — Elec.', color: 'bg-[#F97316]' },
    { day: 3, span: 1, name: 'Torres — HVAC', color: 'bg-green-500' },
  ]
  return (
    <div className="bg-[#0a1929] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-2 text-slate-500 text-[11px]">Crew Schedule — Week of Apr 14</span>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {days.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500 font-semibold py-1">{d}</div>
        ))}
      </div>
      <div className="relative grid grid-cols-5 gap-1 h-28">
        {jobs.map((job, i) => (
          <div
            key={i}
            className={`absolute rounded-lg ${job.color} bg-opacity-80 text-white text-[9px] font-semibold p-1.5 flex items-start leading-tight`}
            style={{
              left: `calc(${job.day * 20}% + ${job.day * 2}px)`,
              width: `calc(${job.span * 20}% - 4px + ${(job.span - 1) * 2}px)`,
              top: `${i * 26}px`,
              height: '22px',
            }}
          >
            {job.name}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-[10px] text-slate-400">4 jobs scheduled this week · 2 techs available</span>
      </div>
    </div>
  )
}

export function DemoTabs({ locale }: { locale: string }) {
  const [active, setActive] = useState('estimates')
  const current = TABS.find(t => t.id === active)!

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex justify-center gap-2 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#F97316] text-white shadow-lg shadow-orange-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Mockup */}
      <div className="animate-fadeIn max-w-2xl mx-auto">
        {current.mockup}
      </div>

      <div className="text-center mt-10">
        <Link
          href={`/${locale}/sign-up`}
          className="inline-flex items-center gap-2 bg-[#F97316] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#ea6c0a] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Start your free trial <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
