import { pgTable, text, timestamp, varchar, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'

export const expenseTypeEnum = pgEnum('expense_type', ['labor', 'material', 'subcontractor', 'other'])

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  type: expenseTypeEnum('type').default('other').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).default('0').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
