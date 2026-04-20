// One-shot script: apply only the non-destructive schema additions needed to
// unblock the runtime error after the post-audit refactor.
//
// Skips dropping the `financing_partner*` columns from `users` because they
// still hold data (`drizzle-kit push` warned about 2 rows). Run a manual
// `pnpm drizzle-kit push` later when you're ready to drop them.

import 'dotenv/config'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = postgres(url, { max: 1 })

async function applyIfMissing(label, fn) {
  try {
    await fn()
    console.log(`✓ ${label}`)
  } catch (err) {
    const msg = (err && err.message) || String(err)
    if (/already exists|duplicate/i.test(msg)) {
      console.log(`= ${label} (already applied)`)
    } else {
      console.error(`✗ ${label}: ${msg}`)
      throw err
    }
  }
}

try {
  await applyIfMissing('estimates.follow_up_sent_at', () =>
    sql.unsafe('ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "follow_up_sent_at" timestamp'),
  )

  await applyIfMissing('processed_webhooks table', () =>
    sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "processed_webhooks" (
        "event_id" varchar(255) PRIMARY KEY NOT NULL,
        "source" varchar(50) NOT NULL,
        "event_type" varchar(100) NOT NULL,
        "processed_at" timestamp DEFAULT now() NOT NULL,
        "note" text
      )
    `),
  )

  await applyIfMissing('cron_executions table', () =>
    sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "cron_executions" (
        "id" text PRIMARY KEY NOT NULL,
        "job" varchar(50) NOT NULL,
        "started_at" timestamp DEFAULT now() NOT NULL,
        "finished_at" timestamp,
        "duration_ms" integer,
        "status" varchar(20) NOT NULL,
        "results" json,
        "error" text
      )
    `),
  )

  // ALTER TYPE ... ADD VALUE doesn't support IF NOT EXISTS until Postgres 12+.
  // Wrap it in a DO block that swallows the duplicate_object error.
  await applyIfMissing("notification_type enum += 'document_viewed'", () =>
    sql.unsafe(`
      DO $$
      BEGIN
        ALTER TYPE "notification_type" ADD VALUE 'document_viewed';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `),
  )

  console.log('\nDone. Restart the dev server.')
} finally {
  await sql.end({ timeout: 5 })
}
