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
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted' | 'expired'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'
export type ChangeOrderStatus = 'draft' | 'sent' | 'approved' | 'rejected'
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed'
export type ReferralStatus = 'pending' | 'signed_up' | 'subscribed'

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
  shareToken: string | null
  markupPercent: string | null; discountType: string | null; discountValue: string | null
  depositType: string | null; depositAmount: string | null; depositPaid: boolean | null; depositPaidAt: Date | null
  signatureDataUrl: string | null; signedByName: string | null; signedByEmail: string | null
  signedAt: Date | null; signedIp: string | null
  contractId: string | null; autoGenerateInvoice: boolean | null
  poNumber: string | null; privateNotes: string | null
  showFinancing: boolean | null; allowExpire: boolean | null
  createdAt: Date; updatedAt: Date
}

export interface Invoice {
  id: string; userId: string; jobId: string | null; estimateId: string | null
  number: string; clientName: string; clientEmail: string | null
  status: InvoiceStatus; subtotal: string; tax: string; total: string
  dueDate: Date | null; paidAt: Date | null; notes: string | null
  poNumber: string | null; privateNotes: string | null
  stripePaymentIntentId: string | null; shareToken: string | null
  createdAt: Date; updatedAt: Date
}

export interface LineItem {
  id: string; parentId: string; parentType: string; type: LineItemType
  description: string; quantity: string; unitPrice: string; total: string
  markupPercent: string | null; section: string | null
  sortOrder: number | null; createdAt: Date
}

export interface CatalogItem {
  id: string; userId: string; name: string; type: LineItemType
  description: string | null; unitPrice: string; unit: string | null
  category: string | null; createdAt: Date; updatedAt: Date
}
export type CatalogItemInput = Omit<CatalogItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

export interface User {
  id: string; email: string; name: string | null; companyName: string | null
  phone: string | null; plan: string | null; stripeCustomerId: string | null
  stripeSubscriptionId: string | null; logoUrl: string | null
  taxRate: string | null; documentFooter: string | null; paymentTerms: string | null
  acceptAch: boolean | null; coverProcessingFee: boolean | null
  licenseNumber: string | null; licenseState: string | null
  insuranceInfo: string | null; websiteUrl: string | null
  socialLinks: Record<string, string> | null; showCredentialsOnDocs: boolean | null
  smsEnabled: boolean | null; smsPhoneNumber: string | null
  businessTaxId: string | null; businessAddress: string | null; businessType: string | null
  createdAt: Date; updatedAt: Date
}

export interface EstimateTemplate {
  id: string; userId: string; name: string; notes: string | null
  lineItems: any[]; discountType: string | null; discountValue: string | null
  markupPercent: string | null; depositType: string | null; depositAmount: string | null
  contractId: string | null; createdAt: Date; updatedAt: Date
}

export type NotificationType = 'invoice_overdue' | 'invoice_paid' | 'estimate_approved' | 'job_completed_no_invoice' | 'document_viewed' | 'shopping_list_created'

export interface Notification {
  id: string; userId: string; type: NotificationType
  title: string; body: string; href: string
  read: boolean; createdAt: Date
}

export interface Photo {
  id: string; userId: string; jobId: string | null; estimateId: string | null
  lineItemId: string | null; description: string | null; url: string
  thumbnailUrl: string | null; sortOrder: number | null; createdAt: Date
}

export type PaymentType = 'deposit' | 'milestone' | 'partial' | 'final'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type PaymentMethod = 'card' | 'ach' | 'check' | 'cash'

export interface Payment {
  id: string; userId: string; invoiceId: string | null; estimateId: string | null
  type: PaymentType; amount: string; status: PaymentStatus; method: PaymentMethod
  stripePaymentIntentId: string | null; referenceNumber: string | null
  paidAt: Date | null; createdAt: Date
}

export interface PaymentMilestone {
  id: string; invoiceId: string; name: string; amountPercent: string | null
  amount: string; dueDate: Date | null; status: PaymentStatus
  stripePaymentIntentId: string | null; paidAt: Date | null
  sortOrder: number | null; createdAt: Date
}

export interface Contract {
  id: string; userId: string; name: string; content: string
  isDefault: boolean; createdAt: Date; updatedAt: Date
}

export interface DocumentView {
  id: string; userId: string; documentId: string; documentType: string
  viewedAt: Date; ip: string | null; userAgent: string | null
}

export interface ChangeOrder {
  id: string; userId: string; jobId: string; estimateId: string | null
  number: string; description: string | null; status: ChangeOrderStatus
  subtotal: string; tax: string; total: string
  shareToken: string | null; signatureDataUrl: string | null
  signedByName: string | null; signedAt: Date | null; notes: string | null
  createdAt: Date; updatedAt: Date
}

export interface WorkOrder {
  id: string; userId: string; jobId: string; number: string; title: string
  instructions: string | null; scheduledDate: Date | null; status: WorkOrderStatus
  assignedTechnicianIds: string[]; createdAt: Date; updatedAt: Date
}

export interface Referral {
  id: string; referrerId: string; referredEmail: string
  referredUserId: string | null; status: ReferralStatus; reward: string
  createdAt: Date
}

export interface QboConnection {
  id: string; userId: string; realmId: string
  accessToken: string; refreshToken: string; tokenExpiresAt: Date
  createdAt: Date; updatedAt: Date
}

export interface JobChecklistItem {
  id: string; jobId: string; label: string; completed: boolean
  sortOrder: number | null; completedAt: Date | null; createdAt: Date
}

// Input types
export type ReferralInput = { referredEmail: string }
export type ChangeOrderInput = Omit<ChangeOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type WorkOrderInput = Omit<WorkOrder, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type EstimateTemplateInput = Omit<EstimateTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
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
    findAllJobAssignments(userId: string): Promise<{ jobId: string; technicianId: string; technicianName: string }[]>
  }
  expenses: {
    findAll(userId: string): Promise<Expense[]>
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
    findRecent(userId: string, limit?: number): Promise<Job[]>
    findById(id: string, userId: string): Promise<Job | null>
    create(userId: string, data: JobInput): Promise<Job>
    update(id: string, userId: string, data: Partial<JobInput>): Promise<Job>
    delete(id: string, userId: string): Promise<void>
  }
  estimates: {
    findAll(userId: string): Promise<Estimate[]>
    findRecent(userId: string, limit?: number): Promise<Estimate[]>
    findById(id: string, userId: string): Promise<Estimate | null>
    findByJob(jobId: string, userId: string): Promise<Estimate[]>
    findByToken(token: string): Promise<Estimate | null>
    create(userId: string, data: EstimateInput, items: LineItemInput[]): Promise<Estimate>
    update(id: string, userId: string, data: Partial<EstimateInput>): Promise<Estimate>
    delete(id: string, userId: string): Promise<void>
  }
  invoices: {
    findAll(userId: string): Promise<Invoice[]>
    findRecent(userId: string, limit?: number): Promise<Invoice[]>
    findById(id: string, userId: string): Promise<Invoice | null>
    findByJob(jobId: string, userId: string): Promise<Invoice[]>
    findByToken(token: string): Promise<Invoice | null>
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
    delete(id: string): Promise<void>
  }
  notifications: {
    findByUser(userId: string, limit?: number): Promise<Notification[]>
    countUnread(userId: string): Promise<number>
    create(userId: string, data: Omit<Notification, 'id' | 'userId' | 'createdAt'>): Promise<Notification>
    markRead(id: string, userId: string): Promise<void>
    markAllRead(userId: string): Promise<void>
  }
  payments: {
    findByInvoice(invoiceId: string): Promise<Payment[]>
    findByEstimate(estimateId: string): Promise<Payment[]>
    create(userId: string, data: Omit<Payment, 'id' | 'userId' | 'createdAt'>): Promise<Payment>
    update(id: string, data: Partial<Payment>): Promise<Payment>
  }
  milestones: {
    findByInvoice(invoiceId: string): Promise<PaymentMilestone[]>
    create(data: Omit<PaymentMilestone, 'id' | 'createdAt'>): Promise<PaymentMilestone>
    update(id: string, data: Partial<PaymentMilestone>): Promise<PaymentMilestone>
  }
  catalogItems: {
    findAll(userId: string): Promise<CatalogItem[]>
    findById(id: string, userId: string): Promise<CatalogItem | null>
    create(userId: string, data: CatalogItemInput): Promise<CatalogItem>
    update(id: string, userId: string, data: Partial<CatalogItemInput>): Promise<CatalogItem>
    delete(id: string, userId: string): Promise<void>
  }
  photos: {
    findByJob(jobId: string): Promise<Photo[]>
    findByEstimate(estimateId: string): Promise<Photo[]>
    findByLineItem(lineItemId: string): Promise<Photo[]>
    create(userId: string, data: Omit<Photo, 'id' | 'userId' | 'createdAt'>): Promise<Photo>
    delete(id: string, userId: string): Promise<void>
  }
  contracts: {
    findAll(userId: string): Promise<Contract[]>
    findById(id: string, userId: string): Promise<Contract | null>
    create(userId: string, data: { name: string; content: string; isDefault?: boolean }): Promise<Contract>
    update(id: string, userId: string, data: Partial<{ name: string; content: string; isDefault: boolean }>): Promise<Contract>
    delete(id: string, userId: string): Promise<void>
  }
  documentViews: {
    create(data: Omit<DocumentView, 'id' | 'viewedAt'>): Promise<DocumentView>
    findByDocument(documentId: string, documentType: string): Promise<DocumentView[]>
    countByDocument(documentId: string, documentType: string): Promise<number>
  }
  changeOrders: {
    findAll(userId: string): Promise<ChangeOrder[]>
    findById(id: string, userId: string): Promise<ChangeOrder | null>
    findByJob(jobId: string, userId: string): Promise<ChangeOrder[]>
    findByToken(token: string): Promise<ChangeOrder | null>
    create(userId: string, data: ChangeOrderInput, items: LineItemInput[]): Promise<ChangeOrder>
    update(id: string, userId: string, data: Partial<ChangeOrder>): Promise<ChangeOrder>
    delete(id: string, userId: string): Promise<void>
  }
  workOrders: {
    findAll(userId: string): Promise<WorkOrder[]>
    findById(id: string, userId: string): Promise<WorkOrder | null>
    findByJob(jobId: string, userId: string): Promise<WorkOrder[]>
    create(userId: string, data: WorkOrderInput): Promise<WorkOrder>
    update(id: string, userId: string, data: Partial<WorkOrder>): Promise<WorkOrder>
    delete(id: string, userId: string): Promise<void>
  }
  estimateTemplates: {
    findAll(userId: string): Promise<EstimateTemplate[]>
    findById(id: string, userId: string): Promise<EstimateTemplate | null>
    create(userId: string, data: EstimateTemplateInput): Promise<EstimateTemplate>
    delete(id: string, userId: string): Promise<void>
  }
  referrals: {
    findByReferrer(userId: string): Promise<Referral[]>
    create(userId: string, data: ReferralInput): Promise<Referral>
    updateStatus(id: string, status: ReferralStatus, referredUserId?: string): Promise<Referral>
  }
  jobChecklist: {
    findByJob(jobId: string): Promise<JobChecklistItem[]>
    create(data: { jobId: string; label: string; sortOrder?: number }): Promise<JobChecklistItem>
    update(id: string, data: Partial<{ label: string; completed: boolean; completedAt: Date | null; sortOrder: number }>): Promise<JobChecklistItem>
    delete(id: string): Promise<void>
    createDefaults(jobId: string): Promise<JobChecklistItem[]>
  }
  qboConnections: {
    findByUser(userId: string): Promise<QboConnection | null>
    upsert(userId: string, data: Omit<QboConnection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<QboConnection>
    delete(userId: string): Promise<void>
  }
}
