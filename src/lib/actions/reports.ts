'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'

export async function getReportsData() {
  const userId = await requireAuth()

  const [jobs, invoices, expenses, technicians] = await Promise.all([
    dbAdapter.jobs.findAll(userId),
    dbAdapter.invoices.findAll(userId),
    dbAdapter.expenses.findAll(userId),
    dbAdapter.technicians.findAll(userId),
  ])

  // --- Revenue vs Cost by month (last 12 months) ---
  const now = new Date()
  const months: { label: string; revenue: number; cost: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    const monthStart = d
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

    const revenue = invoices
      .filter(inv => inv.status === 'paid' && inv.paidAt && new Date(inv.paidAt) >= monthStart && new Date(inv.paidAt) <= monthEnd)
      .reduce((s, inv) => s + parseFloat(inv.total), 0)

    const cost = expenses
      .filter(exp => new Date(exp.date) >= monthStart && new Date(exp.date) <= monthEnd)
      .reduce((s, exp) => s + parseFloat(exp.amount), 0)

    months.push({ label, revenue, cost })
  }

  // --- Top jobs by margin ---
  const jobMargins = jobs
    .filter(j => parseFloat(j.budgetedCost) > 0 || parseFloat(j.actualCost) > 0)
    .map(j => {
      const revenue = invoices
        .filter(inv => inv.jobId === j.id && inv.status === 'paid')
        .reduce((s, inv) => s + parseFloat(inv.total), 0)
      const cost = expenses
        .filter(exp => exp.jobId === j.id)
        .reduce((s, exp) => s + parseFloat(exp.amount), 0)
      const margin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
      return { id: j.id, name: j.name, clientName: j.clientName, revenue, cost, margin }
    })
    .filter(j => j.revenue > 0 || j.cost > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // --- Labor by technician ---
  const laborByTech = technicians.map(t => {
    const techExpenses = expenses.filter(e => e.technicianId === t.id && e.type === 'labor')
    const hours = techExpenses.reduce((s, e) => s + parseFloat(e.hours ?? '0'), 0)
    const cost = techExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)
    return { id: t.id, name: t.name, hours, cost }
  }).filter(t => t.hours > 0 || t.cost > 0)

  // --- Expense breakdown by type ---
  const expenseByType: Record<string, number> = {}
  for (const exp of expenses) {
    expenseByType[exp.type] = (expenseByType[exp.type] ?? 0) + parseFloat(exp.amount)
  }
  const expenseBreakdown = Object.entries(expenseByType).map(([type, total]) => ({ type, total }))

  // --- Summary KPIs ---
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
  const totalCost = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const activeJobs = jobs.filter(j => j.status === 'active').length
  const pendingRevenue = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + parseFloat(i.total), 0)

  return {
    months,
    jobMargins,
    laborByTech,
    expenseBreakdown,
    kpis: { totalRevenue, totalCost, netProfit: totalRevenue - totalCost, activeJobs, pendingRevenue },
  }
}
