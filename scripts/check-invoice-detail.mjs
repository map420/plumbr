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
  const num = process.argv[2] || 'INV-011'
  const [inv] = await db`SELECT id, number, status, total, paid_at FROM invoices WHERE number = ${num}`
  if (!inv) { console.log('not found'); process.exit(0) }
  console.log(`Invoice ${inv.number} (${inv.id})`)
  console.log(`  status=${inv.status} total=$${inv.total} paidAt=${inv.paid_at}`)

  const pays = await db`
    SELECT id, amount, status, method, stripe_payment_intent_id, reference_number, paid_at, created_at
    FROM payments
    WHERE invoice_id = ${inv.id}
    ORDER BY created_at ASC
  `
  console.log(`\n${pays.length} payment(s):`)
  for (const p of pays) {
    console.log(`  ${p.created_at.toISOString()} · $${p.amount} · ${p.status}/${p.method} · pi=${p.stripe_payment_intent_id ?? 'null'} · ref=${p.reference_number ?? 'null'}`)
  }
} finally {
  await db.end()
}
