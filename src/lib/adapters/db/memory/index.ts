import type { DbAdapter, Expense, Client, Job, Estimate, Invoice, LineItem, User, ExpenseInput, ClientInput, JobInput, EstimateInput, InvoiceInput, LineItemInput } from '../types'

// In-memory store — persists for the Node.js process lifetime
const store = {
  expenses: new Map<string, Expense>(),
  clients: new Map<string, Client>(),
  jobs: new Map<string, Job>(),
  estimates: new Map<string, Estimate>(),
  invoices: new Map<string, Invoice>(),
  lineItems: new Map<string, LineItem>(),
  users: new Map<string, User>(),
  counters: { est: 0, inv: 0 },
}

function uuid() { return crypto.randomUUID() }
function now() { return new Date() }

export const memoryAdapter: DbAdapter = {
  expenses: {
    async findByJob(jobId, userId) {
      return [...store.expenses.values()]
        .filter(e => e.jobId === jobId && e.userId === userId)
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
    async findById(id, userId) {
      const e = store.estimates.get(id)
      return e?.userId === userId ? e : null
    },
    async findByJob(jobId, userId) {
      return [...store.estimates.values()].filter(e => e.jobId === jobId && e.userId === userId)
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
    async findById(id, userId) {
      const i = store.invoices.get(id)
      return i?.userId === userId ? i : null
    },
    async findByJob(jobId, userId) {
      return [...store.invoices.values()].filter(i => i.jobId === jobId && i.userId === userId)
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
}
