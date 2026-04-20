/**
 * Totals recomputation for estimates and invoices.
 *
 * Source of truth: `line_items.total`. Everything else is derived.
 *
 * Order of operations (per estimate/invoice):
 *   1. subtotal = Σ line_items.total
 *   2. discountAmount = discountType==='percent' ? subtotal * (discountValue/100) : fixed
 *   3. markupAmount = subtotal * (markupPercent/100)
 *   4. taxable = max(subtotal - discountAmount + markupAmount, 0)
 *   5. tax = taxable * userTaxRate
 *   6. total = taxable + tax
 *
 * NOTE: line_items.total already embeds qty*price (and per-line markup if set). This function
 * doesn't re-inflate per-line markup; it only applies the *estimate-level* markup.
 */

import { db } from '@/db'
import { lineItems } from '@/db/schema/line-items'
import { estimates } from '@/db/schema/estimates'
import { invoices } from '@/db/schema/invoices'
import { users } from '@/db/schema/users'
import { and, eq } from 'drizzle-orm'
import { parseTaxRate } from '@/lib/tax'

export type Totals = {
  subtotal: number
  discountAmount: number
  markupAmount: number
  taxable: number
  tax: number
  total: number
}

type ParentRow = {
  userId: string
  markupPercent: string | null
  discountType: string | null
  discountValue: string | null
}

function computeFromParts(
  lineTotals: number[],
  parent: ParentRow,
  userTaxRate: string | null | undefined,
): Totals {
  const subtotal = lineTotals.reduce((s, n) => s + n, 0)

  const discountValue = parent.discountValue ? parseFloat(parent.discountValue) : 0
  const discountAmount = parent.discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : parent.discountType === 'fixed' ? discountValue : 0

  const markupPercent = parent.markupPercent ? parseFloat(parent.markupPercent) : 0
  const markupAmount = subtotal * (markupPercent / 100)

  const taxable = Math.max(subtotal - discountAmount + markupAmount, 0)
  const tax = Math.round(taxable * parseTaxRate(userTaxRate) * 100) / 100
  const total = Math.round((taxable + tax) * 100) / 100

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    markupAmount: round2(markupAmount),
    taxable: round2(taxable),
    tax,
    total,
  }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

/**
 * Recompute totals for an estimate or invoice from its line items and persist.
 * Safe to call from any action that mutates line items or parent-level markup/discount.
 */
export async function recomputeAndPersistTotals(
  parentType: 'estimate' | 'invoice',
  parentId: string,
): Promise<Totals | null> {
  // Fetch parent (for userId, markup, discount) + line items + user tax rate
  if (parentType === 'estimate') {
    const [parent] = await db.select().from(estimates).where(eq(estimates.id, parentId))
    if (!parent) return null
    const items = await db.select({ total: lineItems.total })
      .from(lineItems)
      .where(and(eq(lineItems.parentId, parentId), eq(lineItems.parentType, 'estimate')))
    const [user] = await db.select({ taxRate: users.taxRate }).from(users).where(eq(users.id, parent.userId))
    const totals = computeFromParts(
      items.map(i => parseFloat(i.total)),
      { userId: parent.userId, markupPercent: parent.markupPercent, discountType: parent.discountType, discountValue: parent.discountValue },
      user?.taxRate,
    )
    // Preserva updatedAt: un recompute de totales no es un cambio semántico del usuario.
    // Tocarlo contamina señales como lastActivityAt (ver clients/page.tsx).
    await db.update(estimates)
      .set({ subtotal: String(totals.subtotal), tax: String(totals.tax), total: String(totals.total) })
      .where(eq(estimates.id, parentId))
    return totals
  }

  const [parent] = await db.select().from(invoices).where(eq(invoices.id, parentId))
  if (!parent) return null
  const items = await db.select({ total: lineItems.total })
    .from(lineItems)
    .where(and(eq(lineItems.parentId, parentId), eq(lineItems.parentType, 'invoice')))
  const [user] = await db.select({ taxRate: users.taxRate }).from(users).where(eq(users.id, parent.userId))
  // Invoices don't have markup/discount fields in current schema — treat as zero
  const totals = computeFromParts(
    items.map(i => parseFloat(i.total)),
    { userId: parent.userId, markupPercent: null, discountType: null, discountValue: null },
    user?.taxRate,
  )
  await db.update(invoices)
    .set({ subtotal: String(totals.subtotal), tax: String(totals.tax), total: String(totals.total) })
    .where(eq(invoices.id, parentId))
  return totals
}

/**
 * Pure version — compute without DB write. Useful in portal views to render fresh totals
 * without mutating DB, or for previews before save.
 */
export function computeTotals(
  lineTotals: number[],
  parent: ParentRow,
  userTaxRate: string | null | undefined,
): Totals {
  return computeFromParts(lineTotals, parent, userTaxRate)
}

/**
 * Convenience for UI: given an estimate (with markup/discount + taxRate from user profile)
 * and its line items, return live-computed totals. Prefer this over reading `estimate.subtotal`
 * directly — guarantees UI reflects current items even if DB field is stale.
 */
export function getEstimateTotals(
  estimate: { markupPercent?: string | null; discountType?: string | null; discountValue?: string | null },
  lineItems: { total: string | number }[],
  userTaxRate: string | null | undefined,
): Totals {
  const itemTotals = lineItems.map(li => typeof li.total === 'number' ? li.total : parseFloat(li.total))
  return computeFromParts(
    itemTotals,
    { userId: '', markupPercent: estimate.markupPercent ?? null, discountType: estimate.discountType ?? null, discountValue: estimate.discountValue ?? null },
    userTaxRate,
  )
}

/** Same for invoices (no markup/discount). */
export function getInvoiceTotals(
  lineItems: { total: string | number }[],
  userTaxRate: string | null | undefined,
): Totals {
  const itemTotals = lineItems.map(li => typeof li.total === 'number' ? li.total : parseFloat(li.total))
  return computeFromParts(
    itemTotals,
    { userId: '', markupPercent: null, discountType: null, discountValue: null },
    userTaxRate,
  )
}
