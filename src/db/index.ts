import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// PgBouncer (Supabase pooler) requires prepare:false — prepared statements are
// not supported by the transaction-mode pooler. Supabase pooler pool_size=15:
// keeping max<=10 leaves headroom for concurrent cron/webhooks without EMAXCONNSESSION.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 10,
  idle_timeout: 10,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
})
export const db = drizzle(client, { schema })
