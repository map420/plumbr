import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'
import { dbAdapter } from '@/lib/adapters/db'
import { addNotionUser } from '@/lib/notion'
import { Resend } from 'resend'
import { db } from '@/db'
import { processedWebhooks } from '@/db/schema/processed-webhooks'
import { eq } from 'drizzle-orm'

const APP_NAME = 'WorkPilot'
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'moisesap498@gmail.com'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    console.error('[webhooks/clerk] CLERK_WEBHOOK_SECRET is not set')
    return new Response('No webhook secret', { status: 500 })
  }

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
  } catch (err) {
    console.error('[webhooks/clerk] invalid signature', { svix_id, error: (err as Error)?.message })
    return new Response('Invalid signature', { status: 400 })
  }

  // Idempotency: Svix retries on 5xx. Record the event id up-front and bail on duplicate.
  const existing = await db.select().from(processedWebhooks).where(eq(processedWebhooks.eventId, svix_id)).limit(1)
  if (existing.length > 0) {
    return new Response('Already processed', { status: 200 })
  }
  await db.insert(processedWebhooks).values({
    eventId: svix_id,
    source: 'clerk',
    eventType: evt.type,
  }).onConflictDoNothing()

  try {
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
          acceptAch: null, coverProcessingFee: null,
          licenseNumber: null, licenseState: null, insuranceInfo: null,
          websiteUrl: null, socialLinks: null, showCredentialsOnDocs: null,
          smsEnabled: null, smsPhoneNumber: null,
        } as any)

        const name = [first_name, last_name].filter(Boolean).join(' ') || null
        const now = new Date()
        const fecha = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric' })
        const hora = now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' })

        await Promise.all([
          addNotionUser({ id, name, email, plan: null }).catch(err => console.error('[webhooks/clerk] notion sync failed:', err)),
          process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY).emails.send({
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
          }).catch(err => console.error('[webhooks/clerk] owner email failed:', err)) : Promise.resolve(),
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

    if (evt.type === 'user.deleted') {
      const { id } = evt.data
      if (id) {
        // User rows cascade via FK ON DELETE CASCADE — deleting the user row cleans up downstream data.
        // Wrap in try/catch so a missing row doesn't bubble up (Clerk sometimes re-fires delete events).
        try {
          await dbAdapter.users.delete(id)
        } catch (err) {
          console.warn('[webhooks/clerk] user.deleted cleanup warning:', (err as Error)?.message)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[webhooks/clerk] handler error:', err)
    // Remove the idempotency marker so Svix can retry
    await db.delete(processedWebhooks).where(eq(processedWebhooks.eventId, svix_id)).catch(() => null)
    return new Response('Handler failed', { status: 500 })
  }
}
