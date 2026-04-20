import { pgTable, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { technicians } from './technicians'
import { expenses } from './expenses'
import { sql } from 'drizzle-orm'

export const jobClockSessions = pgTable('job_clock_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  technicianId: text('technician_id').references(() => technicians.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  expenseId: text('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('job_clock_sessions_job_idx').on(t.jobId),
  uniqueIndex('job_clock_sessions_active_idx').on(t.jobId).where(sql`${t.endedAt} IS NULL`),
])

export type JobClockSession = typeof jobClockSessions.$inferSelect
export type NewJobClockSession = typeof jobClockSessions.$inferInsert
