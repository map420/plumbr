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
import { eq, and, desc, count } from 'drizzle-orm'
import type { DbAdapter, Job, JobInput, EstimateInput, InvoiceInput, LineItemInput } from '../types'

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
  },
  expenses: {
    async findByJob(jobId, userId) {
      return db.select().from(expenses)
        .where(and(eq(expenses.jobId, jobId), eq(expenses.userId, userId)))
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
      return rows[0] ?? null
    },
    async upsert(data) {
      const [user] = await db.insert(users).values({ ...data })
        .onConflictDoUpdate({ target: users.id, set: { ...data, updatedAt: new Date() } })
        .returning()
      return user
    },
    async update(id, data) {
      const [user] = await db.update(users).set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id)).returning()
      return user
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
}
