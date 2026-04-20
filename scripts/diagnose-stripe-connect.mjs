import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const key = process.env.STRIPE_SECRET_KEY
const keyMode = key?.startsWith('sk_live_') ? 'LIVE' : key?.startsWith('sk_test_') ? 'TEST' : 'unknown'
console.log(`Stripe key mode: ${keyMode}`)

// Test 1: intentar crear connected account
console.log('\n[Test 1] Creating test Express Connect account...')
try {
  const res = await fetch('https://api.stripe.com/v1/accounts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      type: 'express',
      country: 'US',
      email: 'diag-test@example.com',
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
    }),
  })
  const data = await res.json()
  if (data.error) {
    console.log('❌ FAILED:', data.error.message)
    console.log('   Type:', data.error.type)
    console.log('   Code:', data.error.code || '(no code)')
  } else {
    console.log('✅ SUCCESS: account created', data.id)
    console.log('   → deleting test account...')
    await fetch(`https://api.stripe.com/v1/accounts/${data.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${key}` },
    })
    console.log('   → deleted')
  }
} catch (e) {
  console.log('❌ Network error:', e.message)
}

// Test 2: verificar capabilities del platform
console.log('\n[Test 2] Platform account info...')
try {
  const res = await fetch('https://api.stripe.com/v1/account', {
    headers: { 'Authorization': `Bearer ${key}` },
  })
  const data = await res.json()
  console.log('Platform account type:', data.type ?? 'n/a')
  console.log('Platform country:', data.country ?? 'n/a')
  console.log('Details submitted:', data.details_submitted ?? 'n/a')
  console.log('Charges enabled:', data.charges_enabled ?? 'n/a')
  console.log('Business type:', data.business_type ?? 'n/a')
} catch (e) {
  console.log('❌ Error:', e.message)
}
