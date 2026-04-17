import { pgTable, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

export const contracts = pgTable('contracts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Contract = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
