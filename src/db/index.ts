import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// PgBouncer (Supabase pooler) requires prepare:false — prepared statements are
// not supported by the transaction-mode pooler.
//
// max: 20 — the previous value of 3 throttled concurrent requests under any
// real load. Supabase's transaction-mode pooler accepts much more; 20 per
// serverless instance is a safe default without exhausting the upstream pool.
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 20, idle_timeout: 20 })
export const db = drizzle(client, { schema })
