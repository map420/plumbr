// Shared domain types (independent of Drizzle)
export interface Technician {
  id: string; userId: string; name: string; email: string
  phone: string | null; hourlyRate: string | null; createdAt: Date; updatedAt: Date
}
export type TechnicianInput = Omit<Technician, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

export type ExpenseType = 'labor' | 'material' | 'subcontractor' | 'other'

export interface Expense {
  id: string; userId: string; jobId: string
  description: string; type: ExpenseType; amount: string
  technicianId: string | null; hours: string | null; ratePerHour: string | null
  date: Date; createdAt: Date
}

export interface Client {
  id: string; userId: string; name: string
  email: string | null; phone: string | null; address: string | null; notes: string | null
  createdAt: Date; updatedAt: Date
}

export type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'

export interface Job {
  id: string; userId: string; clientId: string | null; name: string; clientName: string
  clientEmail: string | null; clientPhone: string | null; address: string | null
  status: JobStatus; budgetedCost: string; actualCost: string
  startDate: Date | null; endDate: Date | null; notes: string | null
  createdAt: Date; updatedAt: Date
}

export interface Estimate {
  id: string; userId: string; jobId: string | null; clientId: string | null; number: string
  clientName: string; clientEmail: string | null; clientPhone: string | null; status: EstimateStatus
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

export type NotificationType = 'invoice_overdue' | 'invoice_paid' | 'estimate_approved' | 'job_completed_no_invoice'

export interface Notification {
  id: string; userId: string; type: NotificationType
  title: string; body: string; href: string
  read: boolean; createdAt: Date
}

// Input types
export type ExpenseInput = Omit<Expense, 'id' | 'userId' | 'createdAt'>
export type ClientInput = Omit<Client, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type JobInput = Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type EstimateInput = Omit<Estimate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type InvoiceInput = Omit<Invoice, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type LineItemInput = Omit<LineItem, 'id' | 'createdAt'>

// Repository interfaces
export interface DbAdapter {
  technicians: {
    findAll(userId: string): Promise<Technician[]>
    findById(id: string, userId: string): Promise<Technician | null>
    create(userId: string, data: TechnicianInput): Promise<Technician>
    update(id: string, userId: string, data: Partial<TechnicianInput>): Promise<Technician>
    delete(id: string, userId: string): Promise<void>
    assignToJob(jobId: string, technicianId: string): Promise<void>
    removeFromJob(jobId: string, technicianId: string): Promise<void>
    findByJob(jobId: string): Promise<Technician[]>
    findJobsByTechnician(technicianId: string): Promise<string[]>
  }
  expenses: {
    findByJob(jobId: string, userId: string): Promise<Expense[]>
    findByTechnician(technicianId: string, userId: string): Promise<Expense[]>
    create(userId: string, data: ExpenseInput): Promise<Expense>
    delete(id: string, userId: string): Promise<void>
  }
  clients: {
    findAll(userId: string): Promise<Client[]>
    findById(id: string, userId: string): Promise<Client | null>
    create(userId: string, data: ClientInput): Promise<Client>
    update(id: string, userId: string, data: Partial<ClientInput>): Promise<Client>
    delete(id: string, userId: string): Promise<void>
  }
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
  notifications: {
    findByUser(userId: string, limit?: number): Promise<Notification[]>
    countUnread(userId: string): Promise<number>
    create(userId: string, data: Omit<Notification, 'id' | 'userId' | 'createdAt'>): Promise<Notification>
    markRead(id: string, userId: string): Promise<void>
    markAllRead(userId: string): Promise<void>
  }
}
