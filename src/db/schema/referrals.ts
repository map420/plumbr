import { pgTable, text, timestamp, varchar, numeric } from 'drizzle-orm/pg-core'
import { users } from './users'

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: text('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredEmail: varchar('referred_email', { length: 255 }).notNull(),
  referredUserId: text('referred_user_id'),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | signed_up | subscribed
  reward: numeric('reward', { precision: 12, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Referral = typeof referrals.$inferSelect
export type NewReferral = typeof referrals.$inferInsert
