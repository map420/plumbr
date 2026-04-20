import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getStripe } from '@/lib/stripe'
import { dbAdapter } from '@/lib/adapters/db'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { invoices } from '@/db/schema/invoices'
import { payments } from '@/db/schema/payments'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break
      const userId = session.metadata?.userId
      if (!userId) break
      await dbAdapter.users.update(userId, {
        plan: 'pro',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await getStripe().customers.retrieve(sub.customer as string)
      if (customer.deleted) break
      const userId = (customer as Stripe.Customer).metadata?.userId
      if (!userId) break
      const isActive = sub.status === 'active' || sub.status === 'trialing'
      await dbAdapter.users.update(userId, {
        plan: isActive ? 'pro' : 'starter',
        stripeSubscriptionId: sub.id,
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customer = await getStripe().customers.retrieve(sub.customer as string)
      if (customer.deleted) break
      const userId = (customer as Stripe.Customer).metadata?.userId
      if (!userId) break
      await dbAdapter.users.update(userId, {
        plan: 'starter',
        stripeSubscriptionId: null,
      })
      break
    }

    // ── Stripe Connect: sync account status al DB cuando contractor completa/actualiza onboarding ──
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      // Lookup user por stripe_account_id (usa el índice añadido en migración 0018)
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.stripeAccountId, account.id)).limit(1)
      if (rows.length === 0) break
      const userId = rows[0].id
      await db.update(users).set({
        stripeAccountChargesEnabled: account.charges_enabled ?? false,
        stripeAccountPayoutsEnabled: account.payouts_enabled ?? false,
      }).where(eq(users.id, userId))
      break
    }

    // ── Invoice payment (connected account) — cliente pagó via Stripe payment link ──
    // Para recibir este evento en cuentas Connect, el endpoint en Stripe dashboard
    // debe tener "Listen to events on Connected accounts" habilitado.
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const invoiceId = pi.metadata?.invoiceId
      if (!invoiceId) break

      // Idempotency: Stripe reintenta webhooks; evita duplicados.
      const existing = await db.select({ id: payments.id })
        .from(payments)
        .where(eq(payments.stripePaymentIntentId, pi.id))
        .limit(1)
      if (existing.length > 0) break

      const invRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
      if (invRows.length === 0) break
      const inv = invRows[0]

      const amount = (pi.amount_received ?? pi.amount) / 100
      const now = new Date()

      await db.insert(payments).values({
        userId: inv.userId,
        invoiceId: inv.id,
        estimateId: null,
        type: 'final',
        amount: amount.toFixed(2),
        status: 'paid',
        method: 'card',
        stripePaymentIntentId: pi.id,
        referenceNumber: null,
        paidAt: now,
      })

      // Mark invoice paid si el monto recibido cubre el total (tolerancia 1¢).
      const invoiceTotal = parseFloat(inv.total)
      if (amount + 0.01 >= invoiceTotal) {
        await db.update(invoices).set({
          status: 'paid',
          paidAt: now,
        }).where(eq(invoices.id, inv.id))
      }

      revalidatePath('/[locale]/invoices', 'page')
      revalidatePath('/[locale]/invoices/[id]', 'page')
      break
    }

    case 'account.application.deauthorized': {
      // Contractor desconectó desde su Stripe dashboard → cleanup en nuestro DB.
      // event.account trae el connected account id (no está en data.object para este evento).
      const connectedAccountId = (event as Stripe.Event & { account?: string }).account
      if (!connectedAccountId) break
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.stripeAccountId, connectedAccountId)).limit(1)
      if (rows.length === 0) break
      await db.update(users).set({
        stripeAccountId: null,
        stripeAccountChargesEnabled: false,
        stripeAccountPayoutsEnabled: false,
      }).where(eq(users.id, rows[0].id))
      break
    }
  }

  return NextResponse.json({ received: true })
}
