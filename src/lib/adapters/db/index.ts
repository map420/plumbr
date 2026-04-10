import { drizzleAdapter } from './drizzle'
import { memoryAdapter } from './memory'

export const dbAdapter = process.env.DATABASE_URL ? drizzleAdapter : memoryAdapter
