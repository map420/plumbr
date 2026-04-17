import { pgTable, text, timestamp, varchar, numeric } from 'drizzle-orm/pg-core'
import { users } from './users'
import { lineItemTypeEnum } from './line-items'

export const catalogItems = pgTable('catalog_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: lineItemTypeEnum('type').default('labor').notNull(),
  description: varchar('description', { length: 500 }),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).default('0').notNull(),
  unit: varchar('unit', { length: 50 }), // "hour", "sq ft", "each"
  category: varchar('category', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type CatalogItem = typeof catalogItems.$inferSelect
export type NewCatalogItem = typeof catalogItems.$inferInsert
