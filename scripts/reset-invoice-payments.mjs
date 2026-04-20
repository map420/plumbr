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

const num = process.argv[2] || 'INV-011'
const db = postgres(process.env.DATABASE_URL, { max: 1 })
try {
  const [inv] = await db`SELECT id, number FROM invoices WHERE number = ${num}`
  if (!inv) { console.log(`Invoice ${num} not found`); process.exit(1) }

  const deleted = await db`DELETE FROM payments WHERE invoice_id = ${inv.id} RETURNING id, amount, status`
  console.log(`Deleted ${deleted.length} payment(s) on ${num}:`)
  for (const d of deleted) console.log(`  · $${d.amount} (${d.status})`)

  await db`UPDATE invoices SET status = 'sent', paid_at = NULL WHERE id = ${inv.id}`
  console.log(`\nReset ${num} → status=sent, paid_at=null`)
} finally {
  await db.end()
}
