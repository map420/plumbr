import { pgTable, text, timestamp, varchar, numeric, boolean, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft', 'sent', 'paid', 'overdue', 'cancelled'
])

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  estimateId: text('estimate_id'),
  number: varchar('number', { length: 50 }).notNull(), // INV-001
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  shareToken: text('share_token').unique(),
  notes: text('notes'),
  poNumber: varchar('po_number', { length: 50 }),
  privateNotes: text('private_notes'),
  autoGenerateInvoice: boolean('auto_generate_invoice').default(false),
  reminderSentAt: timestamp('reminder_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('invoices_user_id_idx').on(t.userId),
  index('invoices_user_status_idx').on(t.userId, t.status),
  index('invoices_user_created_idx').on(t.userId, t.createdAt),
  index('invoices_job_id_idx').on(t.jobId),
  index('invoices_due_date_idx').on(t.dueDate),
])

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert
