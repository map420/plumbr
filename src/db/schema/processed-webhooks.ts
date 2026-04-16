import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

/**
 * Idempotency ledger for third-party webhooks (Clerk/Svix today, Stripe later).
 * Each Svix event id is recorded once; a duplicate POST is a no-op on the side-effects.
 */
export const processedWebhooks = pgTable('processed_webhooks', {
  eventId: varchar('event_id', { length: 255 }).primaryKey(),
  source: varchar('source', { length: 50 }).notNull(), // 'clerk' | 'stripe' | ...
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  note: text('note'),
})

export type ProcessedWebhook = typeof processedWebhooks.$inferSelect
