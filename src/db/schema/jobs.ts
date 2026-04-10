import { pgTable, text, timestamp, varchar, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const jobStatusEnum = pgEnum('job_status', [
  'lead', 'active', 'on_hold', 'completed', 'cancelled'
])

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  address: text('address'),
  status: jobStatusEnum('status').default('lead').notNull(),
  budgetedCost: numeric('budgeted_cost', { precision: 12, scale: 2 }).default('0'),
  actualCost: numeric('actual_cost', { precision: 12, scale: 2 }).default('0'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert
