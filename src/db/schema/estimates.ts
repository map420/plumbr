import { pgTable, text, timestamp, varchar, numeric, pgEnum, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { clients } from './clients'

export const estimateStatusEnum = pgEnum('estimate_status', [
  'draft', 'sent', 'approved', 'rejected', 'converted'
])

export const estimates = pgTable('estimates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(), // EST-001
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  status: estimateStatusEnum('status').default('draft').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  validUntil: timestamp('valid_until'),
  convertedToInvoiceId: text('converted_to_invoice_id'),
  shareToken: text('share_token').unique(),
  // Additional fields
  poNumber: varchar('po_number', { length: 50 }),
  privateNotes: text('private_notes'),
  showFinancing: boolean('show_financing').default(false),
  allowExpire: boolean('allow_expire').default(true),
  // Markup & discount
  markupPercent: numeric('markup_percent', { precision: 5, scale: 2 }),
  discountType: varchar('discount_type', { length: 10 }), // 'percent' | 'fixed'
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }),
  // Deposit
  depositType: varchar('deposit_type', { length: 10 }), // 'percent' | 'fixed'
  depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }),
  depositPaid: boolean('deposit_paid').default(false),
  depositPaidAt: timestamp('deposit_paid_at'),
  // Signature
  signatureDataUrl: text('signature_data_url'),
  signedByName: varchar('signed_by_name', { length: 255 }),
  signedByEmail: varchar('signed_by_email', { length: 255 }),
  signedAt: timestamp('signed_at'),
  signedIp: varchar('signed_ip', { length: 50 }),
  // Contract
  contractId: text('contract_id'),
  // Auto-generate invoice
  autoGenerateInvoice: boolean('auto_generate_invoice').default(false),
  // Cron follow-up idempotency — set when follow-up email is sent so we don't resend on edits
  followUpSentAt: timestamp('follow_up_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('estimates_user_id_idx').on(t.userId),
  index('estimates_user_status_idx').on(t.userId, t.status),
  index('estimates_user_created_idx').on(t.userId, t.createdAt),
  index('estimates_job_id_idx').on(t.jobId),
])

export type Estimate = typeof estimates.$inferSelect
export type NewEstimate = typeof estimates.$inferInsert
