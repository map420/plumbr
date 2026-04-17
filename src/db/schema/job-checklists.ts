import { pgTable, text, timestamp, varchar, boolean, integer } from 'drizzle-orm/pg-core'
import { jobs } from './jobs'

export const jobChecklistItems = pgTable('job_checklist_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  sortOrder: integer('sort_order').default(0),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type JobChecklistItem = typeof jobChecklistItems.$inferSelect
export type NewJobChecklistItem = typeof jobChecklistItems.$inferInsert
