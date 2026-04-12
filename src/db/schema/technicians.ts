import { pgTable, text, timestamp, varchar, pgEnum, numeric } from 'drizzle-orm/pg-core'
import { users } from './users'

export const userRoleEnum = pgEnum('user_role', ['admin', 'technician'])

export const technicians = pgTable('technicians', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // owner (admin)
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const jobTechnicians = pgTable('job_technicians', {
  jobId: text('job_id').notNull(),
  technicianId: text('technician_id').notNull().references(() => technicians.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

export type Technician = typeof technicians.$inferSelect
export type NewTechnician = typeof technicians.$inferInsert
export type JobTechnician = typeof jobTechnicians.$inferSelect
