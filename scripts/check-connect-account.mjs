import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const accountId = process.argv[2] || 'acct_1TO1b41LIOgjbin8'
const key = process.env.STRIPE_SECRET_KEY

const res = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
  headers: { 'Authorization': `Bearer ${key}` },
})
const a = await res.json()
if (a.error) { console.log('ERROR:', a.error.message); process.exit(1) }

console.log('Account:', a.id)
console.log('Charges enabled:', a.charges_enabled)
console.log('Payouts enabled:', a.payouts_enabled)
console.log('Details submitted:', a.details_submitted)
console.log('Disabled reason:', a.requirements?.disabled_reason || '(none)')
console.log('Currently due:', JSON.stringify(a.requirements?.currently_due || [], null, 2))
console.log('Past due:', JSON.stringify(a.requirements?.past_due || [], null, 2))
console.log('Eventually due:', JSON.stringify(a.requirements?.eventually_due || [], null, 2))
console.log('Pending verification:', JSON.stringify(a.requirements?.pending_verification || [], null, 2))
console.log('Capabilities:', JSON.stringify(a.capabilities, null, 2))
