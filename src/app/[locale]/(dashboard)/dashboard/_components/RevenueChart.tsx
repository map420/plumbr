'use client'

import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

type Props = {
  data: { month: string; revenue: number; projected: number }[]
}

export default function RevenueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={130}>
      <ComposedChart data={data} barSize={16} barGap={0}>
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v: any, name: any) => [`$${Number(v).toLocaleString()}`, name === 'revenue' ? 'Actual' : 'Projected']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <ReferenceLine x={data[5]?.month} stroke="var(--wp-border)" strokeDasharray="3 3" />
        <Bar dataKey="revenue" fill="#1E3A5F" radius={[3, 3, 0, 0]} />
        <Bar dataKey="projected" fill="#1E3A5F" fillOpacity={0.2} radius={[3, 3, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
