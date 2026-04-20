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
  const invoices = await db`
    SELECT id, number, status, total, paid_at, created_at
    FROM invoices
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log('Recent invoices:')
  for (const i of invoices) {
    console.log(`  #${i.number} · ${i.status} · $${i.total} · paidAt=${i.paid_at ?? 'null'}`)
  }

  const pays = await db`
    SELECT invoice_id, amount, status, method, stripe_payment_intent_id, paid_at
    FROM payments
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log('\nRecent payments:')
  for (const p of pays) {
    console.log(`  inv=${p.invoice_id?.slice(0, 8)} · $${p.amount} · ${p.status}/${p.method} · pi=${p.stripe_payment_intent_id ?? 'null'}`)
  }
} finally {
  await db.end()
}
