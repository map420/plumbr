import { pgTable, text, timestamp, varchar, numeric, integer, pgEnum } from 'drizzle-orm/pg-core'

export const lineItemTypeEnum = pgEnum('line_item_type', ['labor', 'material', 'subcontractor', 'other'])

export const lineItems = pgTable('line_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  parentId: text('parent_id').notNull(),   // estimate_id or invoice_id
  parentType: varchar('parent_type', { length: 20 }).notNull(), // 'estimate' | 'invoice'
  type: lineItemTypeEnum('type').default('labor').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).default('1').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 12, scale: 2 }).default('0').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type LineItem = typeof lineItems.$inferSelect
export type NewLineItem = typeof lineItems.$inferInsert
