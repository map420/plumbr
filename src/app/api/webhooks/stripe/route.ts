import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { dbAdapter } from '@/lib/adapters/db'
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
  }

  return NextResponse.json({ received: true })
}
