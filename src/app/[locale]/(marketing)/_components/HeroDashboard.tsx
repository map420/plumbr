'use client'

export function HeroDashboard() {
  return (
    <div
      className="relative w-full"
      style={{
        perspective: '1200px',
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
        style={{
          transform: 'rotateY(-8deg) rotateX(4deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Browser chrome */}
        <div className="bg-[#1a1a2e] px-4 py-3 flex items-center gap-2 border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <div className="flex-1 mx-3 bg-white/10 rounded-md h-5 flex items-center px-3">
            <span className="text-white/40 text-[10px]">plumbr.mrlabs.io/en/dashboard</span>
          </div>
        </div>

        {/* Dashboard UI mockup */}
        <div className="bg-[#F8FAFC] flex" style={{ minHeight: '320px' }}>
          {/* Sidebar */}
          <div className="w-14 bg-[#1E3A5F] flex flex-col items-center py-4 gap-4 shrink-0">
            {['🔧', '📋', '🧾', '📅', '👥', '💰'].map((icon, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${i === 0 ? 'bg-white/20' : 'bg-white/5'}`}
              >
                {icon}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="h-3 w-32 bg-slate-800 rounded-full opacity-80 mb-1" />
                <div className="h-2 w-24 bg-slate-400 rounded-full opacity-40" />
              </div>
              <div className="h-7 w-24 bg-[#F97316] rounded-lg opacity-90" />
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Active Jobs', val: '12', color: 'text-blue-600' },
                { label: 'Open Estimates', val: '7', color: 'text-orange-500' },
                { label: 'Revenue', val: '$24k', color: 'text-green-600' },
                { label: 'Avg Margin', val: '38%', color: 'text-purple-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100">
                  <div className="text-[9px] text-slate-400 mb-1">{card.label}</div>
                  <div className={`text-base font-bold ${card.color}`}>{card.val}</div>
                </div>
              ))}
            </div>

            {/* Chart + pie row */}
            <div className="grid grid-cols-3 gap-2">
              {/* Bar chart */}
              <div className="col-span-2 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                <div className="text-[9px] text-slate-400 mb-2">Revenue — Last 6 Months</div>
                <div className="flex items-end gap-1.5 h-16">
                  {[40, 65, 45, 80, 70, 95].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          backgroundColor: i === 5 ? '#F97316' : '#1E3A5F',
                          opacity: i === 5 ? 1 : 0.5 + i * 0.08,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut */}
              <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-[9px] text-slate-400 mb-2">Jobs by Status</div>
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4"
                      strokeDasharray="44 44" strokeDashoffset="0" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="4"
                      strokeDasharray="22 66" strokeDashoffset="-44" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4"
                      strokeDasharray="10 78" strokeDashoffset="-66" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-800">12</div>
                </div>
              </div>
            </div>

            {/* Alert bar */}
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-red-500 text-xs">⚠</span>
              <span className="text-[9px] text-red-700 font-medium">2 jobs are losing money — review margins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -inset-4 bg-[#F97316]/10 blur-3xl rounded-full -z-10 opacity-60" />
    </div>
  )
}
