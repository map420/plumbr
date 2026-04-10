import { auth } from '@clerk/nextjs/server'
import type { AuthAdapter } from './types'

export const clerkAdapter: AuthAdapter = {
  async getUserId() {
    const { userId } = await auth()
    return userId
  },
}
