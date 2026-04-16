import { dbAdapter } from '@/lib/adapters/db'
import { createEstimate, updateEstimate, resendEstimateEmail } from '@/lib/actions/estimates'
import { createJob, updateJob } from '@/lib/actions/jobs'
import { createClient, updateClient } from '@/lib/actions/clients'
import { createExpense } from '@/lib/actions/expenses'
import { createInvoice, updateInvoice } from '@/lib/actions/invoices'
import { createTechnician, assignTechnicianToJob } from '@/lib/actions/technicians'
import { createChangeOrder } from '@/lib/actions/change-orders'
import { createWorkOrder } from '@/lib/actions/work-orders'
import { createCatalogItem } from '@/lib/actions/catalog'
import { createShoppingList } from '@/lib/actions/shopping-lists'
import { getAiPreferences, saveAiPreference } from '@/lib/actions/ai-preferences'

// Resolve an entity by ID or human-readable number. When only a number/name
// is given we scan the recent window (200 rows) instead of the full table.
const RESOLVE_WINDOW = 200

async function resolveEstimateId(userId: string, input: Record<string, any>): Promise<string | null> {
  if (input.estimateId) return input.estimateId
  if (input.estimateNumber) {
    const recent = await dbAdapter.estimates.findRecent(userId, RESOLVE_WINDOW)
    const target = input.estimateNumber.toLowerCase()
    const found = recent.find(e => e.number.toLowerCase() === target)
    return found?.id ?? null
  }
  return null
}

async function resolveInvoiceId(userId: string, input: Record<string, any>): Promise<string | null> {
  if (input.invoiceId) return input.invoiceId
  if (input.invoiceNumber) {
    const recent = await dbAdapter.invoices.findRecent(userId, RESOLVE_WINDOW)
    const target = input.invoiceNumber.toLowerCase()
    const found = recent.find(i => i.number.toLowerCase() === target)
    return found?.id ?? null
  }
  return null
}

async function resolveJobId(userId: string, input: Record<string, any>): Promise<string | null> {
  if (input.jobId) return input.jobId
  if (input.jobName) {
    const recent = await dbAdapter.jobs.findRecent(userId, RESOLVE_WINDOW)
    const target = input.jobName.toLowerCase()
    const found = recent.find(j => j.name.toLowerCase().includes(target))
    return found?.id ?? null
  }
  return null
}

export async function handleToolCall(
  userId: string,
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  try {
    switch (toolName) {
      // ===== READ OPERATIONS =====

      case 'get_jobs': {
        const jobs = await dbAdapter.jobs.findAll(userId)
        const filtered = toolInput.status ? jobs.filter(j => j.status === toolInput.status) : jobs
        return JSON.stringify(filtered.map(j => ({
          id: j.id, name: j.name, client: j.clientName, status: j.status,
          budgeted: j.budgetedCost, actual: j.actualCost,
          start: j.startDate, end: j.endDate, address: j.address,
        })))
      }

      case 'get_estimates': {
        const estimates = await dbAdapter.estimates.findAll(userId)
        const filtered = toolInput.status ? estimates.filter(e => e.status === toolInput.status) : estimates
        return JSON.stringify(filtered.map(e => ({
          id: e.id, number: e.number, client: e.clientName, status: e.status,
          total: e.total, validUntil: e.validUntil, createdAt: e.createdAt,
        })))
      }

      case 'get_invoices': {
        const invoices = await dbAdapter.invoices.findAll(userId)
        const filtered = toolInput.status ? invoices.filter(i => i.status === toolInput.status) : invoices
        const paidTotal = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
        const overdueTotal = filtered.filter(i => i.status === 'overdue').reduce((s, i) => s + parseFloat(i.total), 0)
        return JSON.stringify({
          invoices: filtered.map(i => ({
            id: i.id, number: i.number, client: i.clientName, status: i.status,
            total: i.total, dueDate: i.dueDate, paidAt: i.paidAt,
          })),
          summary: { count: filtered.length, paidTotal: paidTotal.toFixed(2), overdueTotal: overdueTotal.toFixed(2) },
        })
      }

      case 'get_clients': {
        const clients = await dbAdapter.clients.findAll(userId)
        const filtered = toolInput.search
          ? clients.filter(c => c.name.toLowerCase().includes(toolInput.search.toLowerCase()))
          : clients
        return JSON.stringify(filtered.map(c => ({
          id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address,
        })))
      }

      case 'get_client_history': {
        const clients = await dbAdapter.clients.findAll(userId)
        const client = clients.find(c => c.name.toLowerCase().includes(toolInput.clientName.toLowerCase()))
        if (!client) return JSON.stringify({ error: `Client "${toolInput.clientName}" not found` })

        const [jobs, estimates, invoices] = await Promise.all([
          dbAdapter.jobs.findAll(userId),
          dbAdapter.estimates.findAll(userId),
          dbAdapter.invoices.findAll(userId),
        ])
        return JSON.stringify({
          client: { id: client.id, name: client.name, email: client.email, phone: client.phone, address: client.address },
          jobs: jobs.filter(j => j.clientName === client.name).map(j => ({ id: j.id, name: j.name, status: j.status, budgeted: j.budgetedCost })),
          estimates: estimates.filter(e => e.clientName === client.name).map(e => ({ id: e.id, number: e.number, status: e.status, total: e.total })),
          invoices: invoices.filter(i => i.clientName === client.name).map(i => ({ id: i.id, number: i.number, status: i.status, total: i.total, paidAt: i.paidAt })),
          totalBilled: invoices.filter(i => i.clientName === client.name).reduce((s, i) => s + parseFloat(i.total), 0).toFixed(2),
          totalPaid: invoices.filter(i => i.clientName === client.name && i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0).toFixed(2),
        })
      }

      case 'get_expenses': {
        const expenses = await dbAdapter.expenses.findByJob(toolInput.jobId, userId)
        const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
        const byType: Record<string, number> = {}
        expenses.forEach(e => { byType[e.type] = (byType[e.type] || 0) + parseFloat(e.amount) })
        return JSON.stringify({
          expenses: expenses.map(e => ({ description: e.description, type: e.type, amount: e.amount, date: e.date })),
          total: total.toFixed(2),
          byType,
        })
      }

      case 'get_estimate_line_items': {
        const estimateId = await resolveEstimateId(userId, toolInput)
        if (!estimateId) return JSON.stringify({ error: 'Estimate not found. Provide estimateId or estimateNumber.' })
        const estimate = await dbAdapter.estimates.findById(estimateId, userId)
        if (!estimate) return JSON.stringify({ error: 'Estimate not found.' })
        const items = await dbAdapter.lineItems.findByParent(estimateId, 'estimate')
        return JSON.stringify({
          estimateNumber: estimate.number,
          clientName: estimate.clientName,
          status: estimate.status,
          subtotal: estimate.subtotal,
          tax: estimate.tax,
          total: estimate.total,
          items: items.map(li => ({
            type: li.type,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
          })),
          itemCount: items.length,
        })
      }

      case 'get_invoice_line_items': {
        const invoiceId = await resolveInvoiceId(userId, toolInput)
        if (!invoiceId) return JSON.stringify({ error: 'Invoice not found. Provide invoiceId or invoiceNumber.' })
        const invoice = await dbAdapter.invoices.findById(invoiceId, userId)
        if (!invoice) return JSON.stringify({ error: 'Invoice not found.' })
        const items = await dbAdapter.lineItems.findByParent(invoiceId, 'invoice')
        return JSON.stringify({
          invoiceNumber: invoice.number,
          clientName: invoice.clientName,
          status: invoice.status,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          dueDate: invoice.dueDate,
          items: items.map(li => ({
            type: li.type,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
          })),
          itemCount: items.length,
        })
      }

      case 'get_dashboard_stats': {
        const [jobs, invoices, estimates] = await Promise.all([
          dbAdapter.jobs.findAll(userId),
          dbAdapter.invoices.findAll(userId),
          dbAdapter.estimates.findAll(userId),
        ])
        const activeJobs = jobs.filter(j => j.status === 'active')
        const overdueInvoices = invoices.filter(i => i.status === 'overdue')
        const pendingEstimates = estimates.filter(e => e.status === 'sent')
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const revenueThisMonth = invoices
          .filter(i => i.status === 'paid' && i.paidAt && new Date(i.paidAt) >= monthStart)
          .reduce((s, i) => s + parseFloat(i.total), 0)
        const completedJobs = jobs.filter(j => j.status === 'completed')
        const avgMargin = completedJobs.length > 0
          ? completedJobs.reduce((s, j) => {
              const b = parseFloat(j.budgetedCost) || 0
              const a = parseFloat(j.actualCost) || 0
              return s + (b > 0 ? ((b - a) / b) * 100 : 0)
            }, 0) / completedJobs.length
          : 0

        return JSON.stringify({
          activeJobs: { count: activeJobs.length, names: activeJobs.map(j => j.name) },
          overdueInvoices: { count: overdueInvoices.length, total: overdueInvoices.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(2) },
          pendingEstimates: { count: pendingEstimates.length, total: pendingEstimates.reduce((s, e) => s + parseFloat(e.total), 0).toFixed(2) },
          revenueThisMonth: revenueThisMonth.toFixed(2),
          avgJobMargin: avgMargin.toFixed(1) + '%',
          totalJobs: jobs.length,
          totalClients: new Set(jobs.map(j => j.clientName)).size,
        })
      }

      case 'get_technicians': {
        const techs = await dbAdapter.technicians.findAll(userId)
        return JSON.stringify(techs.map(t => ({
          id: t.id, name: t.name, email: t.email, phone: t.phone, hourlyRate: t.hourlyRate,
        })))
      }

      case 'get_change_orders': {
        const cos = await dbAdapter.changeOrders.findByJob(toolInput.jobId, userId)
        return JSON.stringify(cos.map(co => ({
          id: co.id, number: co.number, description: co.description, status: co.status,
          total: co.total, signedAt: co.signedAt,
        })))
      }

      case 'get_work_orders': {
        const wos = await dbAdapter.workOrders.findByJob(toolInput.jobId, userId)
        return JSON.stringify(wos.map(wo => ({
          id: wo.id, number: wo.number, title: wo.title, status: wo.status,
          scheduledDate: wo.scheduledDate, assignedTechnicianIds: wo.assignedTechnicianIds,
        })))
      }

      case 'get_catalog_items': {
        const items = await dbAdapter.catalogItems.findAll(userId)
        return JSON.stringify(items.map(i => ({
          id: i.id, name: i.name, type: i.type, unitPrice: i.unitPrice,
          unit: i.unit, category: i.category,
        })))
      }

      case 'get_job_profitability': {
        const job = await dbAdapter.jobs.findById(toolInput.jobId, userId)
        if (!job) return JSON.stringify({ error: 'Job not found' })
        const expenses = await dbAdapter.expenses.findByJob(toolInput.jobId, userId)
        const invoices = await dbAdapter.invoices.findByJob(toolInput.jobId, userId)
        const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
        const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.total), 0)
        const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.total), 0)
        const budgeted = parseFloat(job.budgetedCost) || 0
        const margin = totalInvoiced > 0 ? ((totalInvoiced - totalExpenses) / totalInvoiced * 100) : 0
        const budgetUsed = budgeted > 0 ? (totalExpenses / budgeted * 100) : 0
        return JSON.stringify({
          job: { name: job.name, client: job.clientName, status: job.status },
          budgeted: budgeted.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          totalInvoiced: totalInvoiced.toFixed(2),
          totalPaid: totalPaid.toFixed(2),
          profit: (totalInvoiced - totalExpenses).toFixed(2),
          margin: margin.toFixed(1) + '%',
          budgetUsed: budgetUsed.toFixed(1) + '%',
          overBudget: totalExpenses > budgeted,
        })
      }

      case 'get_overdue_invoices': {
        const invoices = await dbAdapter.invoices.findAll(userId)
        const overdue = invoices.filter(i => i.status === 'overdue')
        const now = new Date()
        return JSON.stringify({
          invoices: overdue.map(i => ({
            id: i.id, number: i.number, client: i.clientName, total: i.total,
            dueDate: i.dueDate,
            daysOverdue: i.dueDate ? Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / 86400000) : null,
          })),
          totalOverdue: overdue.reduce((s, i) => s + parseFloat(i.total), 0).toFixed(2),
          count: overdue.length,
        })
      }

      case 'get_pending_estimates': {
        const estimates = await dbAdapter.estimates.findAll(userId)
        const pending = estimates.filter(e => e.status === 'sent')
        const now = new Date()
        return JSON.stringify({
          estimates: pending.map(e => ({
            id: e.id, number: e.number, client: e.clientName, total: e.total,
            sentDate: e.updatedAt,
            daysWaiting: Math.floor((now.getTime() - new Date(e.updatedAt).getTime()) / 86400000),
          })),
          totalPending: pending.reduce((s, e) => s + parseFloat(e.total), 0).toFixed(2),
          count: pending.length,
        })
      }

      // ===== CREATE OPERATIONS =====

      case 'create_job': {
        const job = await createJob({
          name: toolInput.name,
          clientName: toolInput.clientName,
          clientEmail: toolInput.clientEmail || '',
          clientPhone: toolInput.clientPhone || '',
          address: toolInput.address || '',
          status: toolInput.status || 'lead',
          budgetedCost: toolInput.budgetedCost || '0',
          actualCost: '0',
          startDate: '',
          endDate: '',
          notes: toolInput.notes || '',
        })
        return JSON.stringify({ success: true, jobId: job.id, name: job.name })
      }

      case 'create_estimate': {
        const items = (toolInput.items || []).map((item: any) => ({
          type: item.type, description: item.description,
          quantity: item.quantity, unitPrice: item.unitPrice,
          total: Math.round(item.quantity * item.unitPrice * 100) / 100,
        }))
        const subtotal = items.reduce((s: number, li: any) => s + li.total, 0)
        const tax = Math.round(subtotal * 0.1 * 100) / 100
        const total = subtotal + tax
        const estimate = await createEstimate({
          jobId: toolInput.jobId || '',
          clientId: '',
          clientName: toolInput.clientName,
          clientEmail: toolInput.clientEmail || '',
          clientPhone: toolInput.clientPhone || '',
          status: 'draft', subtotal, tax, total,
          notes: toolInput.notes || '',
          validUntil: '',
        }, items)
        return JSON.stringify({ success: true, estimateId: estimate.id, number: estimate.number, total: total.toFixed(2) })
      }

      case 'create_invoice_from_estimate': {
        const estId = await resolveEstimateId(userId, toolInput)
        if (!estId) return JSON.stringify({ error: `Estimate ${toolInput.estimateNumber || toolInput.estimateId} not found` })
        const est = await dbAdapter.estimates.findById(estId, userId)
        if (!est) return JSON.stringify({ error: 'Estimate not found' })
        if (est.status !== 'approved') return JSON.stringify({ error: 'Estimate must be approved before converting to invoice' })
        const lineItems = await dbAdapter.lineItems.findByParent(est.id, 'estimate')
        const invoiceItems = lineItems.map(li => ({
          parentId: '', parentType: 'invoice' as const, type: li.type,
          description: li.description, quantity: li.quantity, unitPrice: li.unitPrice,
          total: li.total, markupPercent: li.markupPercent, section: li.section, sortOrder: li.sortOrder,
        }))
        const invoice = await createInvoice({
          jobId: est.jobId || '', estimateId: est.id,
          clientName: est.clientName, clientEmail: est.clientEmail || '',
          status: 'draft', subtotal: parseFloat(est.subtotal),
          tax: parseFloat(est.tax), total: parseFloat(est.total),
          dueDate: '', notes: est.notes || '',
        }, invoiceItems as any)
        await updateEstimate(est.id, { status: 'converted', convertedToInvoiceId: invoice.id })
        return JSON.stringify({ success: true, invoiceId: invoice.id, number: invoice.number, total: est.total })
      }

      case 'create_client': {
        const client = await createClient({
          name: toolInput.name,
          email: toolInput.email || null,
          phone: toolInput.phone || null,
          address: toolInput.address || null,
          notes: toolInput.notes || null,
        })
        return JSON.stringify({ success: true, clientId: client.id, name: client.name })
      }

      case 'create_expense': {
        const expense = await createExpense(toolInput.jobId, {
          description: toolInput.description,
          type: toolInput.type,
          amount: String(toolInput.amount),
          date: new Date().toISOString(),
        })
        return JSON.stringify({ success: true, expenseId: expense.id, amount: expense.amount })
      }

      case 'record_payment': {
        const payment = await dbAdapter.payments.create(userId, {
          invoiceId: toolInput.invoiceId,
          estimateId: null,
          type: 'partial',
          amount: String(toolInput.amount),
          status: 'paid',
          method: toolInput.method,
          stripePaymentIntentId: null,
          referenceNumber: toolInput.referenceNumber || null,
          paidAt: new Date(),
        })
        // Check if invoice is fully paid
        const invoice = await dbAdapter.invoices.findById(toolInput.invoiceId, userId)
        if (invoice) {
          const payments = await dbAdapter.payments.findByInvoice(toolInput.invoiceId)
          const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0)
          const invoiceTotal = parseFloat(invoice.total)
          if (totalPaid >= invoiceTotal) {
            await dbAdapter.invoices.update(toolInput.invoiceId, userId, { status: 'paid', paidAt: new Date() } as any)
          }
        }
        return JSON.stringify({ success: true, paymentId: payment.id, amount: toolInput.amount, method: toolInput.method })
      }

      // ===== UPDATE OPERATIONS =====

      case 'update_job_status': {
        await updateJob(toolInput.jobId, { status: toolInput.status })
        return JSON.stringify({ success: true, jobId: toolInput.jobId, newStatus: toolInput.status })
      }

      case 'update_estimate_status': {
        const estId = await resolveEstimateId(userId, toolInput)
        if (!estId) return JSON.stringify({ error: `Estimate ${toolInput.estimateNumber || toolInput.estimateId} not found` })
        await updateEstimate(estId, { status: toolInput.status })
        return JSON.stringify({ success: true, newStatus: toolInput.status })
      }

      case 'send_estimate_email': {
        const estId = await resolveEstimateId(userId, toolInput)
        if (!estId) return JSON.stringify({ error: `Estimate ${toolInput.estimateNumber || toolInput.estimateId} not found` })
        await resendEstimateEmail(estId)
        return JSON.stringify({ success: true, message: 'Email sent to client successfully.' })
      }

      case 'send_invoice_email': {
        const invoice = await dbAdapter.invoices.findById(toolInput.invoiceId, userId)
        if (!invoice) return JSON.stringify({ error: 'Invoice not found' })
        await dbAdapter.invoices.update(toolInput.invoiceId, userId, { status: 'sent' } as any)
        return JSON.stringify({ success: true, invoiceId: toolInput.invoiceId, message: 'Invoice marked as sent.' })
      }

      // ===== NEW TOOLS =====

      case 'update_client': {
        const { clientId, ...updates } = toolInput
        const clean: Record<string, any> = {}
        if (updates.name) clean.name = updates.name
        if (updates.email) clean.email = updates.email
        if (updates.phone) clean.phone = updates.phone
        if (updates.address) clean.address = updates.address
        if (updates.notes) clean.notes = updates.notes
        await updateClient(clientId, clean)
        return JSON.stringify({ success: true, clientId, updated: Object.keys(clean) })
      }

      case 'update_job': {
        const { jobId, ...updates } = toolInput
        const clean: Record<string, any> = {}
        if (updates.name) clean.name = updates.name
        if (updates.budgetedCost) clean.budgetedCost = updates.budgetedCost
        if (updates.address) clean.address = updates.address
        if (updates.notes) clean.notes = updates.notes
        if (updates.startDate) clean.startDate = updates.startDate
        if (updates.endDate) clean.endDate = updates.endDate
        await updateJob(jobId, clean)
        return JSON.stringify({ success: true, jobId, updated: Object.keys(clean) })
      }

      case 'update_estimate': {
        const { estimateId, ...updates } = toolInput
        const clean: Record<string, any> = {}
        if (updates.notes) clean.notes = updates.notes
        if (updates.validUntil) clean.validUntil = updates.validUntil
        if (updates.markupPercent) clean.markupPercent = parseFloat(updates.markupPercent)
        if (updates.discountAmount) clean.discountAmount = parseFloat(updates.discountAmount)
        if (updates.discountPercent) clean.discountPercent = parseFloat(updates.discountPercent)
        await updateEstimate(estimateId, clean)
        return JSON.stringify({ success: true, estimateId, updated: Object.keys(clean) })
      }

      case 'create_invoice': {
        const items = (toolInput.items || []).map((item: any) => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        }))
        const subtotal = items.reduce((s: number, i: any) => s + i.total, 0)
        const tax = subtotal * 0.1
        const total = subtotal + tax
        const dueDate = toolInput.dueDate || new Date(Date.now() + 30 * 86400000).toISOString()
        const invoice = await createInvoice(
          { jobId: toolInput.jobId || '', estimateId: '', clientName: toolInput.clientName, clientEmail: toolInput.clientEmail || '', status: 'draft', subtotal, tax, total, dueDate, notes: toolInput.notes || '' },
          items
        )
        return JSON.stringify({ success: true, invoiceId: invoice.id, number: invoice.number, total: total.toFixed(2), status: 'draft' })
      }

      case 'update_invoice': {
        const clean: Record<string, any> = {}
        if (toolInput.dueDate) clean.dueDate = toolInput.dueDate
        if (toolInput.notes) clean.notes = toolInput.notes
        if (toolInput.status) clean.status = toolInput.status
        await updateInvoice(toolInput.invoiceId, clean)
        return JSON.stringify({ success: true, invoiceId: toolInput.invoiceId, updated: Object.keys(clean) })
      }

      case 'create_change_order': {
        const items = (toolInput.items || []).map((item: any) => ({
          type: item.type, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: item.quantity * item.unitPrice,
        }))
        const subtotal = items.reduce((s: number, i: any) => s + i.total, 0)
        const co = await createChangeOrder({
          jobId: toolInput.jobId, description: toolInput.description, notes: toolInput.notes || '',
          subtotal, tax: subtotal * 0.1, total: subtotal * 1.1,
        }, items)
        return JSON.stringify({ success: true, changeOrderId: co.id, number: co.number, total: (subtotal * 1.1).toFixed(2) })
      }

      case 'create_work_order': {
        const wo = await createWorkOrder({
          jobId: toolInput.jobId, title: toolInput.title,
          instructions: toolInput.instructions || null,
          scheduledDate: toolInput.scheduledDate || null,
          assignedTechnicianIds: toolInput.technicianIds || [],
        })
        return JSON.stringify({ success: true, workOrderId: wo.id, number: wo.number, title: wo.title })
      }

      case 'create_catalog_item': {
        const item = await createCatalogItem({
          name: toolInput.name, type: toolInput.type, unitPrice: toolInput.unitPrice,
          description: toolInput.description || '', category: toolInput.category || '', unit: null,
        })
        return JSON.stringify({ success: true, catalogItemId: item.id, name: item.name })
      }

      case 'create_technician': {
        const tech = await createTechnician({
          name: toolInput.name, email: toolInput.email,
          phone: toolInput.phone || '', hourlyRate: toolInput.hourlyRate || '',
        })
        return JSON.stringify({ success: true, technicianId: tech.id, name: tech.name })
      }

      case 'assign_technician': {
        await assignTechnicianToJob(toolInput.jobId, toolInput.technicianId)
        return JSON.stringify({ success: true, jobId: toolInput.jobId, technicianId: toolInput.technicianId, message: 'Technician assigned to job.' })
      }

      case 'create_shopping_list': {
        const list = await createShoppingList({
          name: toolInput.name,
          jobId: toolInput.jobId,
          items: (toolInput.items || []).map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            estimatedCost: String(item.estimatedCost),
          })),
        })
        // Notify the contractor in-app — when AI creates a list silently the
        // user has no signal that something happened until they navigate.
        const itemCount = toolInput.items?.length ?? 0
        await dbAdapter.notifications.create(userId, {
          type: 'shopping_list_created',
          title: `New shopping list: ${list.name}`,
          body: `Assistant created a list with ${itemCount} item${itemCount === 1 ? '' : 's'}.`,
          href: `/en/shopping-list/${list.id}`,
          read: false,
        }).catch(err => console.error('[NOTIF] shopping_list_created failed:', err))
        return JSON.stringify({ success: true, shoppingListId: list.id, name: list.name, itemCount })
      }

      case 'get_preferences': {
        const prefs = await getAiPreferences()
        return JSON.stringify(prefs.map(p => ({ key: p.key, value: p.value, learnedFrom: p.learnedFrom })))
      }

      case 'save_preference': {
        await saveAiPreference(toolInput.key, toolInput.value, toolInput.learnedFrom)
        return JSON.stringify({ success: true, key: toolInput.key, value: toolInput.value })
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` })
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message || 'Action failed' })
  }
}
