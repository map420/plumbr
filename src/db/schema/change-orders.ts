import { pgTable, text, timestamp, varchar, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { estimates } from './estimates'

export const changeOrderStatusEnum = pgEnum('change_order_status', ['draft', 'sent', 'approved', 'rejected'])

export const changeOrders = pgTable('change_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  estimateId: text('estimate_id').references(() => estimates.id, { onDelete: 'set null' }),
  number: varchar('number', { length: 50 }).notNull(),
  description: text('description'),
  status: changeOrderStatusEnum('status').default('draft').notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  shareToken: text('share_token').unique(),
  signatureDataUrl: text('signature_data_url'),
  signedByName: varchar('signed_by_name', { length: 255 }),
  signedAt: timestamp('signed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type ChangeOrder = typeof changeOrders.$inferSelect
export type NewChangeOrder = typeof changeOrders.$inferInsert
