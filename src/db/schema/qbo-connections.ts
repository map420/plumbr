import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'

export const qboConnections = pgTable('qbo_connections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  realmId: varchar('realm_id', { length: 50 }).notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type QboConnection = typeof qboConnections.$inferSelect
export type NewQboConnection = typeof qboConnections.$inferInsert
