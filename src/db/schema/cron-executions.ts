import { pgTable, text, timestamp, varchar, integer, json } from 'drizzle-orm/pg-core'

/**
 * Audit log for scheduled cron runs. One row per /api/cron/daily invocation,
 * recording when it ran, how long, what it processed, and whether anything
 * errored. Lets ops see at a glance if the job has missed days or is drifting.
 */
export const cronExecutions = pgTable('cron_executions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  job: varchar('job', { length: 50 }).notNull(), // 'daily'
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  status: varchar('status', { length: 20 }).notNull(), // 'running' | 'ok' | 'failed'
  results: json('results'),
  error: text('error'),
})

export type CronExecution = typeof cronExecutions.$inferSelect
