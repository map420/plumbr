import { pgTable, text, timestamp, varchar, numeric, json } from 'drizzle-orm/pg-core'
import { users } from './users'

export const estimateTemplates = pgTable('estimate_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  notes: text('notes'),
  lineItems: json('line_items').default([]).notNull(),
  discountType: varchar('discount_type', { length: 10 }),
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }),
  markupPercent: numeric('markup_percent', { precision: 5, scale: 2 }),
  depositType: varchar('deposit_type', { length: 10 }),
  depositAmount: numeric('deposit_amount', { precision: 12, scale: 2 }),
  contractId: text('contract_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type EstimateTemplate = typeof estimateTemplates.$inferSelect
export type NewEstimateTemplate = typeof estimateTemplates.$inferInsert
