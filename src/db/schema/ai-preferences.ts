import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'

export const aiPreferences = pgTable('ai_preferences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value').notNull(),
  learnedFrom: text('learned_from'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type AiPreference = typeof aiPreferences.$inferSelect
export type NewAiPreference = typeof aiPreferences.$inferInsert
