import { pgTable, text, timestamp, varchar, numeric, integer, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'
import { expenses } from './expenses'

export const shoppingLists = pgTable('shopping_lists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, archived
  shareToken: varchar('share_token', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('shopping_lists_user_id_idx').on(t.userId),
  index('shopping_lists_job_id_idx').on(t.jobId),
])

export const shoppingListItems = pgTable('shopping_list_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  shoppingListId: text('shopping_list_id').notNull().references(() => shoppingLists.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 50 }),
  estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, purchased
  purchasedAt: timestamp('purchased_at'),
  expenseId: text('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('shopping_list_items_list_id_idx').on(t.shoppingListId),
])

export type ShoppingList = typeof shoppingLists.$inferSelect
export type ShoppingListItem = typeof shoppingListItems.$inferSelect
