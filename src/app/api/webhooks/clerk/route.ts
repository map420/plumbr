import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'
import { dbAdapter } from '@/lib/adapters/db'
import { addNotionUser } from '@/lib/notion'
import { Resend } from 'resend'

const APP_NAME = 'WorkPilot'
const OWNER_EMAIL = 'moisesap498@gmail.com'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) return new Response('No webhook secret', { status: 500 })

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address
    if (email) {
      await dbAdapter.users.upsert({
        id,
        email,
        name: [first_name, last_name].filter(Boolean).join(' ') || null,
        companyName: null, phone: null, plan: null,
        stripeCustomerId: null, stripeSubscriptionId: null,
        logoUrl: null, taxRate: null, documentFooter: null, paymentTerms: null,
      })

      const name = [first_name, last_name].filter(Boolean).join(' ') || null
      const now = new Date()
      const fecha = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric' })
      const hora = now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })

      await Promise.all([
        addNotionUser({ id, name, email, plan: null }),
        new Resend(process.env.RESEND_API_KEY).emails.send({
          from: `${APP_NAME} <noreply@mrlabs.io>`,
          to: OWNER_EMAIL,
          subject: `🆕 Nuevo usuario en ${APP_NAME}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 16px">🆕 Nuevo registro en <strong>${APP_NAME}</strong></h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#888;width:120px">Nombre</td><td style="padding:8px 0"><strong>${name || '—'}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0"><strong>${email}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888">Fecha</td><td style="padding:8px 0">${fecha}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Hora</td><td style="padding:8px 0">${hora} (Lima)</td></tr>
              </table>
            </div>
          `,
        }),
      ])
    }
  }

  if (evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses[0]?.email_address
    if (email) {
      await dbAdapter.users.update(id, {
        email,
        name: [first_name, last_name].filter(Boolean).join(' ') || null,
      })
    }
  }

  return new Response('OK', { status: 200 })
}
