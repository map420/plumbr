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

const body = new URLSearchParams({
  account: accountId,
  refresh_url: 'http://localhost:3000/en/settings?tab=integrations&stripe=refresh',
  return_url: 'http://localhost:3000/en/settings?tab=integrations&stripe=return',
  type: 'account_onboarding',
})

const res = await fetch('https://api.stripe.com/v1/account_links', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body,
})
const data = await res.json()
if (data.error) { console.log('ERROR:', data.error.message); process.exit(1) }
console.log('Resume onboarding URL:')
console.log(data.url)
