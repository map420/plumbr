import { pgTable, text, timestamp, varchar, numeric, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { technicians } from './technicians'

export const expenseTypeEnum = pgEnum('expense_type', ['labor', 'material', 'subcontractor', 'other'])

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  type: expenseTypeEnum('type').default('other').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0').notNull(),
  technicianId: text('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
  hours: numeric('hours', { precision: 6, scale: 2 }),
  ratePerHour: numeric('rate_per_hour', { precision: 10, scale: 2 }),
  date: timestamp('date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('expenses_user_id_idx').on(t.userId),
  index('expenses_job_id_idx').on(t.jobId),
])

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
