// Shared domain types (independent of Drizzle)
export type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'

export interface Job {
  id: string; userId: string; name: string; clientName: string
  clientEmail: string | null; clientPhone: string | null; address: string | null
  status: JobStatus; budgetedCost: string; actualCost: string
  startDate: Date | null; endDate: Date | null; notes: string | null
  createdAt: Date; updatedAt: Date
}

export interface Estimate {
  id: string; userId: string; jobId: string | null; number: string
  clientName: string; clientEmail: string | null; status: EstimateStatus
  subtotal: string; tax: string; total: string; notes: string | null
  validUntil: Date | null; convertedToInvoiceId: string | null
  createdAt: Date; updatedAt: Date
}

export interface Invoice {
  id: string; userId: string; jobId: string | null; estimateId: string | null
  number: string; clientName: string; clientEmail: string | null
  status: InvoiceStatus; subtotal: string; tax: string; total: string
  dueDate: Date | null; paidAt: Date | null; notes: string | null
  stripePaymentIntentId: string | null; createdAt: Date; updatedAt: Date
}

export interface LineItem {
  id: string; parentId: string; parentType: string; type: LineItemType
  description: string; quantity: string; unitPrice: string; total: string
  sortOrder: number | null; createdAt: Date
}

export interface User {
  id: string; email: string; name: string | null; companyName: string | null
  phone: string | null; plan: string | null; stripeCustomerId: string | null
  stripeSubscriptionId: string | null; createdAt: Date; updatedAt: Date
}

// Input types
export type JobInput = Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type EstimateInput = Omit<Estimate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type InvoiceInput = Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type LineItemInput = Omit<LineItem, 'id' | 'createdAt'>

// Repository interfaces
export interface DbAdapter {
  jobs: {
    findAll(userId: string): Promise<Job[]>
    findById(id: string, userId: string): Promise<Job | null>
    create(userId: string, data: JobInput): Promise<Job>
    update(id: string, userId: string, data: Partial<JobInput>): Promise<Job>
    delete(id: string, userId: string): Promise<void>
  }
  estimates: {
    findAll(userId: string): Promise<Estimate[]>
    findById(id: string, userId: string): Promise<Estimate | null>
    findByJob(jobId: string, userId: string): Promise<Estimate[]>
    create(userId: string, data: EstimateInput, items: LineItemInput[]): Promise<Estimate>
    update(id: string, userId: string, data: Partial<EstimateInput>): Promise<Estimate>
    delete(id: string, userId: string): Promise<void>
  }
  invoices: {
    findAll(userId: string): Promise<Invoice[]>
    findById(id: string, userId: string): Promise<Invoice | null>
    findByJob(jobId: string, userId: string): Promise<Invoice[]>
    create(userId: string, data: InvoiceInput, items: LineItemInput[]): Promise<Invoice>
    update(id: string, userId: string, data: Partial<InvoiceInput>): Promise<Invoice>
  }
  lineItems: {
    findByParent(parentId: string, parentType: string): Promise<LineItem[]>
  }
  users: {
    findById(id: string): Promise<User | null>
    upsert(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User>
    update(id: string, data: Partial<User>): Promise<User>
  }
}
