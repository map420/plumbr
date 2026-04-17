import type { SmsAdapter } from './types'

export function createTwilioAdapter(): SmsAdapter {
  return {
    async sendSms(to, body) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_PHONE_NUMBER
      if (!accountSid || !authToken || !from) throw new Error('Twilio not configured')

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'SMS failed')
      return { sid: data.sid }
    },
  }
}
