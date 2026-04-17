// @ts-nocheck
import type { DbAdapter, Technician, Expense, Client, Job, Estimate, Invoice, LineItem, User, Notification, Contract, DocumentView, Referral, QboConnection, TechnicianInput, ExpenseInput, ClientInput, JobInput, EstimateInput, InvoiceInput, LineItemInput, ReferralStatus } from '../types'

// In-memory store — persists for the Node.js process lifetime
const store = {
  technicians: new Map<string, Technician>(),
  jobTechnicians: new Map<string, Set<string>>(), // jobId → Set<technicianId>
  expenses: new Map<string, Expense>(),
  clients: new Map<string, Client>(),
  jobs: new Map<string, Job>(),
  estimates: new Map<string, Estimate>(),
  invoices: new Map<string, Invoice>(),
  lineItems: new Map<string, LineItem>(),
  users: new Map<string, User>(),
  notifications: new Map<string, Notification>(),
  contracts: new Map<string, Contract>(),
  documentViews: new Map<string, DocumentView>(),
  counters: { est: 0, inv: 0 },
}

function uuid() { return crypto.randomUUID() }
function now() { return new Date() }

export const memoryAdapter: DbAdapter = {
  technicians: {
    async findAll(userId) {
      return [...store.technicians.values()].filter(t => t.userId === userId).sort((a, b) => a.name.localeCompare(b.name))
    },
    async findById(id, userId) {
      const t = store.technicians.get(id)
      return t?.userId === userId ? t : null
    },
    async create(userId, data) {
      const t: Technician = { ...data, id: uuid(), userId, createdAt: now(), updatedAt: now() }
      store.technicians.set(t.id, t)
      return t
    },
    async update(id, userId, data) {
      const existing = store.technicians.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.technicians.set(id, updated)
      return updated
    },
    async delete(id, userId) {
      const t = store.technicians.get(id)
      if (t?.userId === userId) store.technicians.delete(id)
    },
    async assignToJob(jobId, technicianId) {
      if (!store.jobTechnicians.has(jobId)) store.jobTechnicians.set(jobId, new Set())
      store.jobTechnicians.get(jobId)!.add(technicianId)
    },
    async removeFromJob(jobId, technicianId) {
      store.jobTechnicians.get(jobId)?.delete(technicianId)
    },
    async findByJob(jobId) {
      const ids = store.jobTechnicians.get(jobId) ?? new Set()
      return [...ids].map(id => store.technicians.get(id)).filter(Boolean) as Technician[]
    },
    async findJobsByTechnician(technicianId) {
      return [...store.jobTechnicians.entries()]
        .filter(([, ids]) => ids.has(technicianId))
        .map(([jobId]) => jobId)
    },
    async findAllJobAssignments(userId) {
      const result: { jobId: string; technicianId: string; technicianName: string }[] = []
      for (const [jobId, techIds] of store.jobTechnicians) {
        for (const techId of techIds) {
          const tech = store.technicians.get(techId)
          if (tech?.userId === userId) result.push({ jobId, technicianId: techId, technicianName: tech.name })
        }
      }
      return result
    },
  },
  expenses: {
    async findAll(userId) {
      return [...store.expenses.values()]
        .filter(e => e.userId === userId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    },
    async findByJob(jobId, userId) {
      return [...store.expenses.values()]
        .filter(e => e.jobId === jobId && e.userId === userId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    },
    async findByTechnician(technicianId, userId) {
      return [...store.expenses.values()]
        .filter(e => e.technicianId === technicianId && e.userId === userId)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
    },
    async create(userId, data) {
      const expense: Expense = { ...data, id: uuid(), userId, createdAt: now() }
      store.expenses.set(expense.id, expense)
      return expense
    },
    async delete(id, userId) {
      const e = store.expenses.get(id)
      if (e?.userId === userId) store.expenses.delete(id)
    },
  },
  clients: {
    async findAll(userId) {
      return [...store.clients.values()]
        .filter(c => c.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async findById(id, userId) {
      const c = store.clients.get(id)
      return c?.userId === userId ? c : null
    },
    async findByNameOrEmail(userId, name, email) {
      for (const c of store.clients.values()) {
        if (c.userId !== userId) continue
        if (c.name === name) return c
        if (email && c.email === email) return c
      }
      return null
    },
    async create(userId, data) {
      const client: Client = { ...data, id: uuid(), userId, createdAt: now(), updatedAt: now() }
      store.clients.set(client.id, client)
      return client
    },
    async update(id, userId, data) {
      const existing = store.clients.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.clients.set(id, updated)
      return updated
    },
    async delete(id, userId) {
      const c = store.clients.get(id)
      if (c?.userId === userId) store.clients.delete(id)
    },
  },
  jobs: {
    async findAll(userId) {
      return [...store.jobs.values()]
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async findRecent(userId, limit = 50) {
      return [...store.jobs.values()]
        .filter(j => j.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    },
    async findById(id, userId) {
      const j = store.jobs.get(id)
      return j?.userId === userId ? j : null
    },
    async create(userId, data) {
      const job: Job = { ...data, id: uuid(), userId, createdAt: now(), updatedAt: now() }
      store.jobs.set(job.id, job)
      return job
    },
    async update(id, userId, data) {
      const existing = store.jobs.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.jobs.set(id, updated)
      return updated
    },
    async delete(id, userId) {
      const j = store.jobs.get(id)
      if (j?.userId === userId) store.jobs.delete(id)
    },
  },

  estimates: {
    async findAll(userId) {
      return [...store.estimates.values()]
        .filter(e => e.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async findRecent(userId, limit = 50) {
      return [...store.estimates.values()]
        .filter(e => e.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    },
    async findById(id, userId) {
      const e = store.estimates.get(id)
      return e?.userId === userId ? e : null
    },
    async findByJob(jobId, userId) {
      return [...store.estimates.values()].filter(e => e.jobId === jobId && e.userId === userId)
    },
    async findByToken(token) {
      return [...store.estimates.values()].find(e => e.shareToken === token) ?? null
    },
    async create(userId, data, items) {
      store.counters.est++
      const number = `EST-${String(store.counters.est).padStart(3, '0')}`
      const estimate: Estimate = { ...data, id: uuid(), userId, number, createdAt: now(), updatedAt: now() }
      store.estimates.set(estimate.id, estimate)
      items.forEach((item, i) => {
        const li: LineItem = { ...item, id: uuid(), parentId: estimate.id, parentType: 'estimate', sortOrder: i, createdAt: now() }
        store.lineItems.set(li.id, li)
      })
      return estimate
    },
    async update(id, userId, data) {
      const existing = store.estimates.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.estimates.set(id, updated)
      return updated
    },
    async delete(id, userId) {
      const e = store.estimates.get(id)
      if (e?.userId === userId) {
        store.estimates.delete(id)
        ;[...store.lineItems.values()]
          .filter(li => li.parentId === id)
          .forEach(li => store.lineItems.delete(li.id))
      }
    },
  },

  invoices: {
    async findAll(userId) {
      return [...store.invoices.values()]
        .filter(i => i.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async findRecent(userId, limit = 50) {
      return [...store.invoices.values()]
        .filter(i => i.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    },
    async findById(id, userId) {
      const i = store.invoices.get(id)
      return i?.userId === userId ? i : null
    },
    async findByJob(jobId, userId) {
      return [...store.invoices.values()].filter(i => i.jobId === jobId && i.userId === userId)
    },
    async findByToken(token) {
      return [...store.invoices.values()].find(i => i.shareToken === token) ?? null
    },
    async create(userId, data, items) {
      store.counters.inv++
      const number = `INV-${String(store.counters.inv).padStart(3, '0')}`
      const invoice: Invoice = { ...data, id: uuid(), userId, number, createdAt: now(), updatedAt: now() }
      store.invoices.set(invoice.id, invoice)
      items.forEach((item, i) => {
        const li: LineItem = { ...item, id: uuid(), parentId: invoice.id, parentType: 'invoice', sortOrder: i, createdAt: now() }
        store.lineItems.set(li.id, li)
      })
      return invoice
    },
    async update(id, userId, data) {
      const existing = store.invoices.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.invoices.set(id, updated)
      return updated
    },
  },

  lineItems: {
    async findByParent(parentId, parentType) {
      return [...store.lineItems.values()]
        .filter(li => li.parentId === parentId && li.parentType === parentType)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    },
  },

  users: {
    async findById(id) {
      return store.users.get(id) ?? null
    },
    async upsert(data) {
      const existing = store.users.get(data.id)
      const user: User = { ...existing, ...data, createdAt: existing?.createdAt ?? now(), updatedAt: now() }
      store.users.set(user.id, user)
      return user
    },
    async update(id, data) {
      const existing = store.users.get(id)
      if (!existing) throw new Error('User not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.users.set(id, updated)
      return updated
    },
  },

  notifications: {
    async findByUser(userId, limit = 30) {
      return [...store.notifications.values()]
        .filter(n => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
    },
    async countUnread(userId) {
      return [...store.notifications.values()].filter(n => n.userId === userId && !n.read).length
    },
    async create(userId, data) {
      const n: Notification = { ...data, id: uuid(), userId, createdAt: now() }
      store.notifications.set(n.id, n)
      return n
    },
    async markRead(id, userId) {
      const n = store.notifications.get(id)
      if (n?.userId === userId) store.notifications.set(id, { ...n, read: true })
    },
    async markAllRead(userId) {
      for (const [id, n] of store.notifications) {
        if (n.userId === userId) store.notifications.set(id, { ...n, read: true })
      }
    },
  },
  contracts: {
    async findAll(userId) {
      return [...store.contracts.values()]
        .filter(c => c.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },
    async findById(id, userId) {
      const c = store.contracts.get(id)
      return c?.userId === userId ? c : null
    },
    async create(userId, data) {
      const contract: Contract = { id: uuid(), userId, name: data.name, content: data.content, isDefault: data.isDefault ?? false, createdAt: now(), updatedAt: now() }
      store.contracts.set(contract.id, contract)
      return contract
    },
    async update(id, userId, data) {
      const existing = store.contracts.get(id)
      if (!existing || existing.userId !== userId) throw new Error('Not found')
      const updated = { ...existing, ...data, updatedAt: now() }
      store.contracts.set(id, updated)
      return updated
    },
    async delete(id, userId) {
      const c = store.contracts.get(id)
      if (c?.userId === userId) store.contracts.delete(id)
    },
  },
  documentViews: {
    async create(data) {
      const view: DocumentView = { id: uuid(), ...data, viewedAt: now() }
      store.documentViews.set(view.id, view)
      return view
    },
    async findByDocument(documentId, documentType) {
      return [...store.documentViews.values()]
        .filter(v => v.documentId === documentId && v.documentType === documentType)
        .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
    },
    async countByDocument(documentId, documentType) {
      return [...store.documentViews.values()]
        .filter(v => v.documentId === documentId && v.documentType === documentType).length
    },
    async countByDocumentsBatch(documentIds, documentType) {
      const ids = new Set(documentIds)
      const out: Record<string, number> = {}
      for (const v of store.documentViews.values()) {
        if (v.documentType !== documentType || !ids.has(v.documentId)) continue
        out[v.documentId] = (out[v.documentId] ?? 0) + 1
      }
      return out
    },
  },
  changeOrders: {
    async findAll() { return [] },
    async findById() { return null },
    async findByJob() { return [] },
    async findByToken() { return null },
    async create() { throw new Error('Not implemented in memory adapter') },
    async update() { throw new Error('Not implemented in memory adapter') },
    async delete() {},
  },
  workOrders: {
    async findAll() { return [] },
    async findById() { return null },
    async findByJob() { return [] },
    async create() { throw new Error('Not implemented in memory adapter') },
    async update() { throw new Error('Not implemented in memory adapter') },
    async delete() {},
  },
  estimateTemplates: {
    async findAll() { return [] },
    async findById() { return null },
    async create() { throw new Error('Not implemented in memory adapter') },
    async delete() {},
  },
  referrals: {
    async findByReferrer() { return [] },
    async create(userId, data) {
      const r: Referral = { id: uuid(), referrerId: userId, referredEmail: data.referredEmail, referredUserId: null, status: 'pending', reward: '0', createdAt: now() }
      return r
    },
    async updateStatus() { throw new Error('Not implemented in memory adapter') },
  },
  qboConnections: {
    async findByUser() { return null },
    async upsert() { throw new Error('Not implemented in memory adapter') },
    async delete() {},
  },
} as unknown as DbAdapter
