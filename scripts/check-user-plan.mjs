import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const db = postgres(process.env.DATABASE_URL, { max: 1 })
try {
  const users = await db`
    SELECT id, email, plan, stripe_account_id, stripe_account_charges_enabled, stripe_account_payouts_enabled
    FROM users
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log('Recent users:')
  for (const u of users) {
    console.log(`  ${u.email} · plan=${u.plan ?? 'null'} · stripeAccountId=${u.stripe_account_id ?? 'null'} · charges=${u.stripe_account_charges_enabled} · payouts=${u.stripe_account_payouts_enabled}`)
  }
} finally {
  await db.end()
}
