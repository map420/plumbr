import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// PgBouncer (Supabase pooler) requires prepare:false — prepared statements are not supported
const client = postgres(process.env.DATABASE_URL!, { ssl: 'require', prepare: false })
export const db = drizzle(client, { schema })
