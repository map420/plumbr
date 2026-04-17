import { pgTable, text, timestamp, varchar, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('clients_user_id_idx').on(t.userId),
])

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert
