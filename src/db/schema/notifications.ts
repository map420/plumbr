import { pgTable, text, timestamp, boolean, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const notificationTypeEnum = pgEnum('notification_type', [
  'invoice_overdue',
  'invoice_paid',
  'estimate_approved',
  'job_completed_no_invoice',
  'document_viewed',
  'shopping_list_created',
])

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  href: text('href').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('notifications_user_id_idx').on(t.userId),
  index('notifications_user_read_idx').on(t.userId, t.read),
])

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
