import { db } from '@/db'
import { technicians, jobTechnicians } from '@/db/schema/technicians'
import { expenses } from '@/db/schema/expenses'
import { clients } from '@/db/schema/clients'
import { jobs } from '@/db/schema/jobs'
import { estimates } from '@/db/schema/estimates'
import { invoices } from '@/db/schema/invoices'
import { lineItems } from '@/db/schema/line-items'
import { users } from '@/db/schema/users'
import { notifications } from '@/db/schema/notifications'
import { catalogItems } from '@/db/schema/catalog-items'
import { payments, paymentMilestones } from '@/db/schema/payments'
import { photos } from '@/db/schema/photos'
import { contracts } from '@/db/schema/contracts'
import { documentViews } from '@/db/schema/document-views'
import { changeOrders } from '@/db/schema/change-orders'
import { workOrders } from '@/db/schema/work-orders'
import { estimateTemplates } from '@/db/schema/estimate-templates'
import { referrals } from '@/db/schema/referrals'
import { qboConnections } from '@/db/schema/qbo-connections'
import { jobChecklistItems } from '@/db/schema/job-checklists'
import { eq, and, desc, count } from 'drizzle-orm'
import type { DbAdapter, Job, JobInput, EstimateInput, InvoiceInput, LineItemInput, CatalogItemInput, ChangeOrderInput, WorkOrderInput, EstimateTemplateInput, ReferralStatus } from '../types'

// Drizzle infers budgetedCost/actualCost as string|null (no notNull in schema); coerce to default
function toJob(row: Omit<Job, 'budgetedCost' | 'actualCost'> & { budgetedCost: string | null; actualCost: string | null }): Job {
  return { ...row, budgetedCost: row.budgetedCost ?? '0', actualCost: row.actualCost ?? '0' }
}

function nextNumber(rows: { number: string }[], prefix: string) {
  const max = rows.reduce((acc, r) => {
    const n = parseInt(r.number.replace(`${prefix}-`, ''), 10)
    return isNaN(n) ? acc : Math.max(acc, n)
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}

export const drizzleAdapter: DbAdapter = {
  technicians: {
    async findAll(userId) {
      return db.select().from(technicians).where(eq(technicians.userId, userId)).orderBy(technicians.name)
    },
    async findById(id, userId) {
      const rows = await db.select().from(technicians).where(and(eq(technicians.id, id), eq(technicians.userId, userId)))
      return rows[0] ?? null
    },
    async create(userId, data) {
      const [t] = await db.insert(technicians).values({ ...data, userId }).returning()
      return t
    },
    async update(id, userId, data) {
      const [t] = await db.update(technicians).set({ ...data, updatedAt: new Date() })
        .where(and(eq(technicians.id, id), eq(technicians.userId, userId))).returning()
      return t
    },
    async delete(id, userId) {
      await db.delete(technicians).where(and(eq(technicians.id, id), eq(technicians.userId, userId)))
    },
    async assignToJob(jobId, technicianId) {
      await db.insert(jobTechnicians).values({ jobId, technicianId }).onConflictDoNothing()
    },
    async removeFromJob(jobId, technicianId) {
      await db.delete(jobTechnicians).where(and(eq(jobTechnicians.jobId, jobId), eq(jobTechnicians.technicianId, technicianId)))
    },
    async findByJob(jobId) {
      const rows = await db.select({ technician: technicians }).from(jobTechnicians)
        .innerJoin(technicians, eq(jobTechnicians.technicianId, technicians.id))
        .where(eq(jobTechnicians.jobId, jobId))
      return rows.map(r => r.technician)
    },
    async findJobsByTechnician(technicianId) {
      const rows = await db.select({ jobId: jobTechnicians.jobId }).from(jobTechnicians)
        .where(eq(jobTechnicians.technicianId, technicianId))
      return rows.map(r => r.jobId)
    },
    async findAllJobAssignments(userId) {
      const rows = await db.select({ jobId: jobTechnicians.jobId, technicianId: technicians.id, technicianName: technicians.name })
        .from(jobTechnicians)
        .innerJoin(technicians, eq(jobTechnicians.technicianId, technicians.id))
        .where(eq(technicians.userId, userId))
      return rows
    },
  },
  expenses: {
    async findAll(userId) {
      return db.select().from(expenses)
        .where(eq(expenses.userId, userId))
        .orderBy(desc(expenses.date))
    },
    async findByJob(jobId, userId) {
      return db.select().from(expenses)
        .where(and(eq(expenses.jobId, jobId), eq(expenses.userId, userId)))
        .orderBy(desc(expenses.date))
    },
    async findByTechnician(technicianId, userId) {
      return db.select().from(expenses)
        .where(and(eq(expenses.userId, userId), eq(expenses.technicianId, technicianId)))
        .orderBy(desc(expenses.date))
    },
    async create(userId, data) {
      const [expense] = await db.insert(expenses).values({ ...data, userId }).returning()
      return expense
    },
    async delete(id, userId) {
      await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    },
  },
  clients: {
    async findAll(userId) {
      return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)))
      return rows[0] ?? null
    },
    async create(userId, data) {
      const [client] = await db.insert(clients).values({ ...data, userId }).returning()
      return client
    },
    async update(id, userId, data) {
      const [client] = await db.update(clients).set({ ...data, updatedAt: new Date() })
        .where(and(eq(clients.id, id), eq(clients.userId, userId))).returning()
      return client
    },
    async delete(id, userId) {
      await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)))
    },
  },
  jobs: {
    async findAll(userId) {
      const rows = await db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt))
      return rows.map(toJob)
    },
    async findById(id, userId) {
      const rows = await db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
      return rows[0] ? toJob(rows[0]) : null
    },
    async create(userId, data) {
      const [job] = await db.insert(jobs).values({ ...data, userId, status: data.status as 'lead' }).returning()
      return toJob(job)
    },
    async update(id, userId, data) {
      const [job] = await db.update(jobs).set({ ...data, updatedAt: new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.userId, userId))).returning()
      return toJob(job)
    },
    async delete(id, userId) {
      await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)))
    },
  },

  estimates: {
    async findAll(userId) {
      return db.select().from(estimates).where(eq(estimates.userId, userId)).orderBy(desc(estimates.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(estimates).where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
      return rows[0] ?? null
    },
    async findByJob(jobId, userId) {
      return db.select().from(estimates).where(and(eq(estimates.jobId, jobId), eq(estimates.userId, userId)))
    },
    async findByToken(token) {
      const rows = await db.select().from(estimates).where(eq(estimates.shareToken, token))
      return rows[0] ?? null
    },
    async create(userId, data, items) {
      const rows = await db.select({ number: estimates.number }).from(estimates).where(eq(estimates.userId, userId))
      const number = nextNumber(rows, 'EST')
      const [estimate] = await db.insert(estimates).values({ ...data, userId, number, status: data.status as 'draft' }).returning()
      if (items.length > 0) {
        await db.insert(lineItems).values(items.map((item, i) => ({ ...item, parentId: estimate.id, parentType: 'estimate' as const, sortOrder: i })))
      }
      return estimate
    },
    async update(id, userId, data) {
      const [estimate] = await db.update(estimates).set({ ...data, updatedAt: new Date() })
        .where(and(eq(estimates.id, id), eq(estimates.userId, userId))).returning()
      return estimate
    },
    async delete(id, userId) {
      await db.delete(lineItems).where(and(eq(lineItems.parentId, id), eq(lineItems.parentType, 'estimate')))
      await db.delete(estimates).where(and(eq(estimates.id, id), eq(estimates.userId, userId)))
    },
  },

  invoices: {
    async findAll(userId) {
      return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      return rows[0] ?? null
    },
    async findByJob(jobId, userId) {
      return db.select().from(invoices).where(and(eq(invoices.jobId, jobId), eq(invoices.userId, userId)))
    },
    async findByToken(token) {
      const rows = await db.select().from(invoices).where(eq(invoices.shareToken, token))
      return rows[0] ?? null
    },
    async create(userId, data, items) {
      const rows = await db.select({ number: invoices.number }).from(invoices).where(eq(invoices.userId, userId))
      const number = nextNumber(rows, 'INV')
      const [invoice] = await db.insert(invoices).values({ ...data, userId, number, status: data.status as 'draft' }).returning()
      if (items.length > 0) {
        await db.insert(lineItems).values(items.map((item, i) => ({ ...item, parentId: invoice.id, parentType: 'invoice' as const, sortOrder: i })))
      }
      return invoice
    },
    async update(id, userId, data) {
      const [invoice] = await db.update(invoices).set({ ...data, updatedAt: new Date() })
        .where(and(eq(invoices.id, id), eq(invoices.userId, userId))).returning()
      return invoice
    },
  },

  lineItems: {
    async findByParent(parentId, parentType) {
      return db.select().from(lineItems)
        .where(and(eq(lineItems.parentId, parentId), eq(lineItems.parentType, parentType)))
        .orderBy(lineItems.sortOrder)
    },
  },

  users: {
    async findById(id) {
      const rows = await db.select().from(users).where(eq(users.id, id))
      if (!rows[0]) return null
      return { ...rows[0], socialLinks: rows[0].socialLinks as Record<string, string> | null } as import('../types').User
    },
    async upsert(data) {
      const { id: _id, ...updateData } = data
      const [user] = await db.insert(users).values({ ...data })
        .onConflictDoUpdate({ target: users.id, set: { ...updateData, updatedAt: new Date() } })
        .returning()
      return { ...user, socialLinks: user.socialLinks as Record<string, string> | null } as import('../types').User
    },
    async update(id, data) {
      const [user] = await db.update(users).set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id)).returning()
      return { ...user, socialLinks: user.socialLinks as Record<string, string> | null } as import('../types').User
    },
    async delete(id) {
      await db.delete(users).where(eq(users.id, id))
    },
  },

  notifications: {
    async findByUser(userId, limit = 30) {
      return db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
    },
    async countUnread(userId) {
      const rows = await db.select({ cnt: count() }).from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      return rows[0]?.cnt ?? 0
    },
    async create(userId, data) {
      const [n] = await db.insert(notifications).values({ ...data, userId }).returning()
      return n
    },
    async markRead(id, userId) {
      await db.update(notifications).set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    },
    async markAllRead(userId) {
      await db.update(notifications).set({ read: true })
        .where(eq(notifications.userId, userId))
    },
  },
  payments: {
    async findByInvoice(invoiceId) {
      return db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt))
    },
    async findByEstimate(estimateId) {
      return db.select().from(payments).where(eq(payments.estimateId, estimateId)).orderBy(desc(payments.createdAt))
    },
    async create(userId, data) {
      const [payment] = await db.insert(payments).values({ ...data, userId }).returning()
      return payment
    },
    async update(id, data) {
      const [payment] = await db.update(payments).set(data).where(eq(payments.id, id)).returning()
      return payment
    },
  },
  milestones: {
    async findByInvoice(invoiceId) {
      return db.select().from(paymentMilestones).where(eq(paymentMilestones.invoiceId, invoiceId)).orderBy(paymentMilestones.sortOrder)
    },
    async create(data) {
      const [milestone] = await db.insert(paymentMilestones).values(data).returning()
      return milestone
    },
    async update(id, data) {
      const [milestone] = await db.update(paymentMilestones).set(data).where(eq(paymentMilestones.id, id)).returning()
      return milestone
    },
  },
  catalogItems: {
    async findAll(userId) {
      return db.select().from(catalogItems).where(eq(catalogItems.userId, userId)).orderBy(catalogItems.name)
    },
    async findById(id, userId) {
      const rows = await db.select().from(catalogItems).where(and(eq(catalogItems.id, id), eq(catalogItems.userId, userId)))
      return rows[0] ?? null
    },
    async create(userId, data) {
      const [item] = await db.insert(catalogItems).values({ ...data, userId }).returning()
      return item
    },
    async update(id, userId, data) {
      const [item] = await db.update(catalogItems).set({ ...data, updatedAt: new Date() })
        .where(and(eq(catalogItems.id, id), eq(catalogItems.userId, userId))).returning()
      return item
    },
    async delete(id, userId) {
      await db.delete(catalogItems).where(and(eq(catalogItems.id, id), eq(catalogItems.userId, userId)))
    },
  },
  photos: {
    async findByJob(jobId) {
      return db.select().from(photos).where(eq(photos.jobId, jobId)).orderBy(photos.sortOrder)
    },
    async findByEstimate(estimateId) {
      return db.select().from(photos).where(eq(photos.estimateId, estimateId)).orderBy(photos.sortOrder)
    },
    async findByLineItem(lineItemId) {
      return db.select().from(photos).where(eq(photos.lineItemId, lineItemId)).orderBy(photos.sortOrder)
    },
    async create(userId, data) {
      const [photo] = await db.insert(photos).values({ ...data, userId }).returning()
      return photo
    },
    async delete(id, userId) {
      await db.delete(photos).where(and(eq(photos.id, id), eq(photos.userId, userId)))
    },
  },
  contracts: {
    async findAll(userId) {
      return db.select().from(contracts).where(eq(contracts.userId, userId)).orderBy(desc(contracts.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
      return rows[0] ?? null
    },
    async create(userId, data) {
      const [contract] = await db.insert(contracts).values({ ...data, userId }).returning()
      return contract
    },
    async update(id, userId, data) {
      const [contract] = await db.update(contracts).set({ ...data, updatedAt: new Date() })
        .where(and(eq(contracts.id, id), eq(contracts.userId, userId))).returning()
      return contract
    },
    async delete(id, userId) {
      await db.delete(contracts).where(and(eq(contracts.id, id), eq(contracts.userId, userId)))
    },
  },
  documentViews: {
    async create(data) {
      const [view] = await db.insert(documentViews).values(data).returning()
      return view
    },
    async findByDocument(documentId, documentType) {
      return db.select().from(documentViews)
        .where(and(eq(documentViews.documentId, documentId), eq(documentViews.documentType, documentType)))
        .orderBy(desc(documentViews.viewedAt))
    },
    async countByDocument(documentId, documentType) {
      const rows = await db.select({ cnt: count() }).from(documentViews)
        .where(and(eq(documentViews.documentId, documentId), eq(documentViews.documentType, documentType)))
      return rows[0]?.cnt ?? 0
    },
  },
  changeOrders: {
    async findAll(userId) {
      return db.select().from(changeOrders).where(eq(changeOrders.userId, userId)).orderBy(desc(changeOrders.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(changeOrders).where(and(eq(changeOrders.id, id), eq(changeOrders.userId, userId)))
      return rows[0] ?? null
    },
    async findByJob(jobId, userId) {
      return db.select().from(changeOrders).where(and(eq(changeOrders.jobId, jobId), eq(changeOrders.userId, userId)))
    },
    async findByToken(token) {
      const rows = await db.select().from(changeOrders).where(eq(changeOrders.shareToken, token))
      return rows[0] ?? null
    },
    async create(userId, data, items) {
      const rows = await db.select({ number: changeOrders.number }).from(changeOrders).where(eq(changeOrders.userId, userId))
      const number = nextNumber(rows, 'CO')
      const [co] = await db.insert(changeOrders).values({ ...data, userId, number, status: data.status as 'draft' }).returning()
      if (items.length > 0) {
        await db.insert(lineItems).values(items.map((item, i) => ({ ...item, parentId: co.id, parentType: 'change_order' as const, sortOrder: i })))
      }
      return co
    },
    async update(id, userId, data) {
      const [co] = await db.update(changeOrders).set({ ...data, updatedAt: new Date() })
        .where(and(eq(changeOrders.id, id), eq(changeOrders.userId, userId))).returning()
      return co
    },
    async delete(id, userId) {
      await db.delete(lineItems).where(and(eq(lineItems.parentId, id), eq(lineItems.parentType, 'change_order')))
      await db.delete(changeOrders).where(and(eq(changeOrders.id, id), eq(changeOrders.userId, userId)))
    },
  },
  workOrders: {
    async findAll(userId) {
      return db.select().from(workOrders).where(eq(workOrders.userId, userId)).orderBy(desc(workOrders.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.userId, userId)))
      return rows[0] ?? null
    },
    async findByJob(jobId, userId) {
      return db.select().from(workOrders).where(and(eq(workOrders.jobId, jobId), eq(workOrders.userId, userId)))
    },
    async create(userId, data) {
      const rows = await db.select({ number: workOrders.number }).from(workOrders).where(eq(workOrders.userId, userId))
      const number = nextNumber(rows, 'WO')
      const [wo] = await db.insert(workOrders).values({ ...data, userId, number, status: data.status as 'pending' }).returning()
      return wo
    },
    async update(id, userId, data) {
      const [wo] = await db.update(workOrders).set({ ...data, updatedAt: new Date() })
        .where(and(eq(workOrders.id, id), eq(workOrders.userId, userId))).returning()
      return wo
    },
    async delete(id, userId) {
      await db.delete(workOrders).where(and(eq(workOrders.id, id), eq(workOrders.userId, userId)))
    },
  },
  estimateTemplates: {
    async findAll(userId) {
      return db.select().from(estimateTemplates).where(eq(estimateTemplates.userId, userId)).orderBy(desc(estimateTemplates.createdAt))
    },
    async findById(id, userId) {
      const rows = await db.select().from(estimateTemplates).where(and(eq(estimateTemplates.id, id), eq(estimateTemplates.userId, userId)))
      return rows[0] ?? null
    },
    async create(userId, data) {
      const [template] = await db.insert(estimateTemplates).values({ ...data, userId }).returning()
      return template
    },
    async delete(id, userId) {
      await db.delete(estimateTemplates).where(and(eq(estimateTemplates.id, id), eq(estimateTemplates.userId, userId)))
    },
  },
  referrals: {
    async findByReferrer(userId) {
      const rows = await db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt))
      return rows as import('../types').Referral[]
    },
    async create(userId, data) {
      const [r] = await db.insert(referrals).values({ referrerId: userId, referredEmail: data.referredEmail }).returning()
      return r as import('../types').Referral
    },
    async updateStatus(id, status, referredUserId) {
      const updates: Record<string, unknown> = { status }
      if (referredUserId) updates.referredUserId = referredUserId
      const [r] = await db.update(referrals).set(updates).where(eq(referrals.id, id)).returning()
      return r as import('../types').Referral
    },
  },
  qboConnections: {
    async findByUser(userId) {
      const rows = await db.select().from(qboConnections).where(eq(qboConnections.userId, userId))
      return rows[0] ?? null
    },
    async upsert(userId, data) {
      const existing = await db.select().from(qboConnections).where(eq(qboConnections.userId, userId))
      if (existing[0]) {
        const [r] = await db.update(qboConnections).set({ ...data, updatedAt: new Date() }).where(eq(qboConnections.userId, userId)).returning()
        return r
      }
      const [r] = await db.insert(qboConnections).values({ ...data, userId }).returning()
      return r
    },
    async delete(userId) {
      await db.delete(qboConnections).where(eq(qboConnections.userId, userId))
    },
  },
  jobChecklist: {
    async findByJob(jobId) {
      return db.select().from(jobChecklistItems).where(eq(jobChecklistItems.jobId, jobId)).orderBy(jobChecklistItems.sortOrder)
    },
    async create(data) {
      const [item] = await db.insert(jobChecklistItems).values(data).returning()
      return item
    },
    async update(id, data) {
      const [item] = await db.update(jobChecklistItems).set(data).where(eq(jobChecklistItems.id, id)).returning()
      return item
    },
    async delete(id) {
      await db.delete(jobChecklistItems).where(eq(jobChecklistItems.id, id))
    },
    async createDefaults(jobId) {
      const defaults = [
        'Review job scope',
        'Confirm materials on site',
        'Take before photos',
        'Complete work',
        'Take after photos',
        'Client sign-off',
      ]
      const items = defaults.map((label, i) => ({ jobId, label, sortOrder: i }))
      return db.insert(jobChecklistItems).values(items).returning()
    },
  },
}
