import { clerkAdapter } from './clerk'
import { mockAdapter } from './mock'

export const authAdapter =
  process.env.CLERK_SECRET_KEY ? clerkAdapter : mockAdapter
