import { pgTable, text, timestamp, varchar, pgEnum, json } from 'drizzle-orm/pg-core'
import { users } from './users'
import { jobs } from './jobs'

export const workOrderStatusEnum = pgEnum('work_order_status', ['pending', 'in_progress', 'completed'])

export const workOrders = pgTable('work_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  instructions: text('instructions'),
  scheduledDate: timestamp('scheduled_date'),
  status: workOrderStatusEnum('status').default('pending').notNull(),
  assignedTechnicianIds: json('assigned_technician_ids').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type WorkOrder = typeof workOrders.$inferSelect
export type NewWorkOrder = typeof workOrders.$inferInsert
