import { pgTable, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { estimates } from './estimates'

export const photos = pgTable('photos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  estimateId: text('estimate_id').references(() => estimates.id, { onDelete: 'set null' }),
  lineItemId: text('line_item_id'),
  description: varchar('description', { length: 500 }),
  url: text('url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Photo = typeof photos.$inferSelect
export type NewPhoto = typeof photos.$inferInsert
