import type { AuthAdapter } from './types'

const MOCK_USER_ID = process.env.MOCK_USER_ID ?? 'user_dev_local'

export const mockAdapter: AuthAdapter = {
  async getUserId() {
    return MOCK_USER_ID
  },
}
