import { pgTable, text, timestamp, varchar, numeric, integer, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { invoices } from './invoices'
import { estimates } from './estimates'

export const paymentTypeEnum = pgEnum('payment_type', ['deposit', 'milestone', 'partial', 'final'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed'])
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'ach', 'check', 'cash'])

export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  estimateId: text('estimate_id').references(() => estimates.id, { onDelete: 'set null' }),
  type: paymentTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  method: paymentMethodEnum('method').default('card').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const paymentMilestones = pgTable('payment_milestones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  amountPercent: numeric('amount_percent', { precision: 5, scale: 2 }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp('due_date'),
  status: paymentStatusEnum('milestone_status').default('pending').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paidAt: timestamp('paid_at'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type PaymentMilestone = typeof paymentMilestones.$inferSelect
export type NewPaymentMilestone = typeof paymentMilestones.$inferInsert
