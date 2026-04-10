import type { EmailAdapter } from './types'

export const mockAdapter: EmailAdapter = {
  async send(opts) {
    console.log('[EMAIL MOCK] to:', opts.to, '| subject:', opts.subject)
    return { id: `mock_${Date.now()}` }
  },
}
