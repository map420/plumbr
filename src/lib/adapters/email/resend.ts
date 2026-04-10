import { Resend } from 'resend'
import type { EmailAdapter } from './types'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

export const resendAdapter: EmailAdapter = {
  async send({ to, subject, html, from }) {
    const { data, error } = await getResend().emails.send({
      from: from ?? `Plumbr <noreply@${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'plumbr.vercel.app'}>`,
      to,
      subject,
      html,
    })
    if (error) throw new Error(`[EMAIL] Resend error: ${error.message}`)
    return { id: data!.id }
  },
}
