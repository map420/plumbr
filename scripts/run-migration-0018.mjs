// Run migration 0018 — users Stripe Connect columns. One-off script.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '..', 'drizzle', 'manual_0018_users_stripe_connect.sql')
const sql = readFileSync(sqlPath, 'utf8')

// Load .env.local manually
const envPath = join(__dirname, '..', '.env.local')
const env = readFileSync(envPath, 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in .env.local')
  process.exit(1)
}

const db = postgres(process.env.DATABASE_URL, { max: 1 })

try {
  console.log('Running migration 0018...')
  // Strip line comments first, THEN split on ; (avoids filter dropping statements
  // that have a leading comment pegado al statement anterior).
  const stripped = sql
    .split('\n')
    .map(line => line.replace(/--.*$/, '').trim())
    .filter(Boolean)
    .join(' ')
  const statements = stripped.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    console.log('→', stmt.slice(0, 100) + (stmt.length > 100 ? '...' : ''))
    await db.unsafe(stmt)
  }
  console.log('\n✅ Migration 0018 applied successfully.')

  // Verify
  const cols = await db`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name LIKE 'stripe_account%'
    ORDER BY column_name
  `
  console.log('\nColumns verified:')
  for (const c of cols) console.log(`  ✓ ${c.column_name}`)
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await db.end()
}
