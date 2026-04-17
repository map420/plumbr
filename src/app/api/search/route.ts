import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getClients } from '@/lib/actions/clients'
import { getJobs } from '@/lib/actions/jobs'
import { getEstimates } from '@/lib/actions/estimates'
import { getInvoices } from '@/lib/actions/invoices'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.toLowerCase().trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [clients, jobs, estimates, invoices] = await Promise.all([
    getClients(), getJobs(), getEstimates(), getInvoices(),
  ])

  const results: { type: string; id: string; title: string; subtitle: string }[] = []

  for (const c of clients) {
    if (c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) {
      results.push({ type: 'client', id: c.id, title: c.name, subtitle: c.email || 'Client' })
    }
  }

  for (const j of jobs) {
    if (j.name.toLowerCase().includes(q) || (j as any).clientName?.toLowerCase().includes(q)) {
      results.push({ type: 'job', id: j.id, title: j.name, subtitle: (j as any).clientName || 'Job' })
    }
  }

  for (const e of estimates) {
    if (e.number.toLowerCase().includes(q) || e.clientName.toLowerCase().includes(q)) {
      results.push({ type: 'estimate', id: e.id, title: e.number, subtitle: e.clientName })
    }
  }

  for (const i of invoices) {
    if (i.number.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) {
      results.push({ type: 'invoice', id: i.id, title: i.number, subtitle: i.clientName })
    }
  }

  return NextResponse.json({ results: results.slice(0, 20) })
}
