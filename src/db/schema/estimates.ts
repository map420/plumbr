import { pgTable, text, timestamp, varchar, numeric, pgEnum } from 'drizzle-orm/pg-core'
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Estimate = typeof estimates.$inferSelect
export type NewEstimate = typeof estimates.$inferInsert
