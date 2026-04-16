import { Resend } from 'resend'
import type { EmailAdapter } from './types'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

const DEFAULT_FROM = process.env.EMAIL_FROM ?? 'WorkPilot <noreply@mrlabs.io>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://workpilot.mrlabs.io'
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'support@mrlabs.io'

export const resendAdapter: EmailAdapter = {
  async send({ to, subject, html, from, replyTo, listUnsubscribeUrl }) {
    // Default List-Unsubscribe target: mailto: owner + web URL (RFC 8058 one-click).
    // This is for transactional emails — clients can ask to stop receiving.
    const unsubUrl = listUnsubscribeUrl ?? `${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}`
    const unsubMailto = `mailto:${OWNER_EMAIL}?subject=unsubscribe`

    const { data, error } = await getResend().emails.send({
      from: from ?? DEFAULT_FROM,
      to,
      subject,
      html,
      ...replyTo && { reply_to: replyTo },
      headers: {
        'List-Unsubscribe': `<${unsubMailto}>, <${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    })
    if (error) throw new Error(`[EMAIL] Resend error: ${error.message}`)
    return { id: data!.id }
  },
}
