import { resendAdapter } from './resend'
import { mockAdapter } from './mock'

export const emailAdapter =
  process.env.RESEND_API_KEY ? resendAdapter : mockAdapter
