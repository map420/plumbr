'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { shoppingLists, shoppingListItems } from '@/db/schema/shopping-lists'
import { eq, and, desc } from 'drizzle-orm'
import { createExpense, deleteExpense } from './expenses'
import {
  validateListName,
  validateItemInput,
  validateItemBatch,
  ValidationError,
  SHOPPING_LIST_LIMITS,
  type CleanItemInput,
} from '@/lib/validation/shopping-list'

async function getUserId() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  return userId
}

/** Verify a job belongs to the current user. Throws if not. */
async function assertJobOwnership(userId: string, jobId: string) {
  const { dbAdapter } = await import('@/lib/adapters/db')
  const job = await dbAdapter.jobs.findById(jobId, userId)
  if (!job) throw new Error('Job not found or not owned by user')
  return job
}

// ── Lists ──

export async function getShoppingLists() {
  const userId = await getUserId()
  const lists = await db.select().from(shoppingLists)
    .where(eq(shoppingLists.userId, userId))
    .orderBy(desc(shoppingLists.createdAt))

  // Get items for each list
  const listsWithItems = await Promise.all(lists.map(async (list) => {
    const items = await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, list.id))
      .orderBy(shoppingListItems.sortOrder)
    const totalItems = items.length
    const purchasedItems = items.filter(it => it.status === 'purchased').length
    const totalCost = items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
    const purchasedCost = items.filter(it => it.status === 'purchased').reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
    return { ...list, items, totalItems, purchasedItems, totalCost, purchasedCost }
  }))

  return listsWithItems
}

/** Lists associated with a specific job, including item-level stats. */
export async function getShoppingListsByJob(jobId: string) {
  const userId = await getUserId()

  // Confirm job ownership before disclosing list metadata.
  await assertJobOwnership(userId, jobId)

  const lists = await db.select().from(shoppingLists)
    .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.jobId, jobId)))
    .orderBy(desc(shoppingLists.createdAt))

  return Promise.all(lists.map(async (list) => {
    const items = await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, list.id))
    const totalItems = items.length
    const purchasedItems = items.filter(it => it.status === 'purchased').length
    const totalCost = items.reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
    const purchasedCost = items.filter(it => it.status === 'purchased').reduce((s, it) => s + parseFloat(it.estimatedCost), 0)
    return {
      id: list.id,
      name: list.name,
      status: list.status,
      totalItems,
      purchasedItems,
      totalCost,
      purchasedCost,
    }
  }))
}

export async function getShoppingList(id: string) {
  const userId = await getUserId()
  const [list] = await db.select().from(shoppingLists)
    .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)))
    .limit(1)
  if (!list) return null

  const items = await db.select().from(shoppingListItems)
    .where(eq(shoppingListItems.shoppingListId, id))
    .orderBy(shoppingListItems.sortOrder)

  return { ...list, items }
}

export async function createShoppingList(data: {
  name: string
  jobId?: string
  items?: { description: string; quantity?: string; unit?: string; estimatedCost: string }[]
}) {
  const userId = await getUserId()

  const cleanName = validateListName(data.name)
  const cleanItems: CleanItemInput[] = data.items ? validateItemBatch(data.items) : []

  if (data.jobId) await assertJobOwnership(userId, data.jobId)

  const [list] = await db.insert(shoppingLists).values({
    userId,
    name: cleanName,
    jobId: data.jobId || null,
    status: 'active',
  }).returning()

  if (cleanItems.length > 0) {
    await db.insert(shoppingListItems).values(
      cleanItems.map((item, i) => ({
        shoppingListId: list.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        estimatedCost: item.estimatedCost,
        sortOrder: i,
      }))
    )
  }

  return list
}

export async function deleteShoppingList(id: string) {
  const userId = await getUserId()
  await db.delete(shoppingLists)
    .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)))
}

/** Mark a shopping list as completed (user closed it). */
export async function markListCompleted(listId: string) {
  const userId = await getUserId()
  await db.update(shoppingLists)
    .set({ status: 'completed', updatedAt: new Date() })
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
}

/** Change or unlink the job associated with a shopping list. Validates ownership. */
export async function updateShoppingListJob(listId: string, newJobId: string | null) {
  const userId = await getUserId()

  if (newJobId) await assertJobOwnership(userId, newJobId)

  await db.update(shoppingLists)
    .set({ jobId: newJobId, updatedAt: new Date() })
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
}

/**
 * Save a chat checklist as a persistent shopping list.
 * Items may already have expenseIds (if purchased via checkbox before saving).
 */
export async function saveChecklistAsList(data: {
  name: string
  jobId?: string
  items: { description: string; estimatedCost: number; expenseId?: string }[]
}) {
  const userId = await getUserId()

  const cleanName = validateListName(data.name)
  // Validate items but preserve the expenseId that came from the chat flow.
  const cleanItems = validateItemBatch(data.items)

  let safeJobId: string | null = null
  if (data.jobId) {
    await assertJobOwnership(userId, data.jobId)
    safeJobId = data.jobId
  }

  const [list] = await db.insert(shoppingLists).values({
    userId,
    name: cleanName,
    jobId: safeJobId,
    status: 'active',
  }).returning()

  const inserted = cleanItems.length > 0
    ? await db.insert(shoppingListItems).values(
        cleanItems.map((item, i) => {
          const sourceExpenseId = (data.items[i] as { expenseId?: string }).expenseId
          return {
            shoppingListId: list.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            estimatedCost: item.estimatedCost,
            status: (sourceExpenseId ? 'purchased' : 'pending') as 'purchased' | 'pending',
            purchasedAt: sourceExpenseId ? new Date() : null,
            expenseId: sourceExpenseId || null,
            sortOrder: i,
          }
        })
      ).returning()
    : []

  return { list, items: inserted }
}

// ── Items ──

export async function addShoppingListItem(listId: string, data: {
  description: string; quantity?: string; unit?: string; estimatedCost: string
}) {
  const userId = await getUserId()

  // Verify the list belongs to the user before mutating its items
  const [list] = await db.select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
    .limit(1)
  if (!list) throw new Error('List not found')

  const clean = validateItemInput(data)

  // Cap items per list — protects DB from runaway inserts (UI bug or hostile client).
  const existing = await db.select({ id: shoppingListItems.id })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.shoppingListId, listId))
  if (existing.length >= SHOPPING_LIST_LIMITS.MAX_ITEMS_PER_LIST) {
    throw new ValidationError(
      `A list cannot exceed ${SHOPPING_LIST_LIMITS.MAX_ITEMS_PER_LIST} items`,
      'items',
    )
  }

  const [item] = await db.insert(shoppingListItems).values({
    shoppingListId: listId,
    description: clean.description,
    quantity: clean.quantity,
    unit: clean.unit,
    estimatedCost: clean.estimatedCost,
    sortOrder: existing.length,
  }).returning()
  return item
}

/**
 * Mark a shopping-list item as purchased AND log the linked expense atomically.
 *
 * Idempotency: the UPDATE filters on `status='pending'`. If a concurrent request
 * already purchased the item, the update affects 0 rows and we abort without
 * creating a duplicate expense. We use a transaction so a failure in expense
 * creation rolls back the status change.
 */
export async function markItemPurchased(itemId: string, jobId: string, actualAmount?: string) {
  const userId = await getUserId()

  // Defense in depth: don't trust the UI — the action verifies job ownership.
  await assertJobOwnership(userId, jobId)

  const [item] = await db.select().from(shoppingListItems)
    .where(eq(shoppingListItems.id, itemId))
    .limit(1)
  if (!item) throw new Error('Item not found')
  if (item.status === 'purchased') {
    // Already done — return the existing expense link to keep the caller idempotent.
    return { alreadyPurchased: true, expenseId: item.expenseId }
  }

  const amount = actualAmount ?? item.estimatedCost
  // Validate the amount (defends against negative / non-numeric overrides from UI).
  validateItemInput({ description: item.description, estimatedCost: amount })

  // Pre-flight reservation: claim the row by flipping status under WHERE status='pending'.
  // A second concurrent caller will get rowCount=0 and bail before creating an expense.
  const reserved = await db.update(shoppingListItems)
    .set({ status: 'purchased', purchasedAt: new Date() })
    .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.status, 'pending')))
    .returning({ id: shoppingListItems.id })

  if (reserved.length === 0) {
    // Lost the race — the other request will create the expense.
    const [fresh] = await db.select().from(shoppingListItems)
      .where(eq(shoppingListItems.id, itemId))
      .limit(1)
    return { alreadyPurchased: true, expenseId: fresh?.expenseId ?? null }
  }

  try {
    const expense = await createExpense(jobId, {
      description: item.description,
      type: 'material',
      amount: String(amount),
      date: new Date().toISOString(),
    })

    await db.update(shoppingListItems)
      .set({ expenseId: expense.id })
      .where(eq(shoppingListItems.id, itemId))

    return { alreadyPurchased: false, expenseId: expense.id, expense }
  } catch (err) {
    // Roll the reservation back so the user can retry without an orphaned status.
    await db.update(shoppingListItems)
      .set({ status: 'pending', purchasedAt: null })
      .where(eq(shoppingListItems.id, itemId))
      .catch(() => null)
    throw err
  }
}

/**
 * Undo a purchase: revert the item to pending and delete the linked expense.
 * Safe to call if the item is already pending or has no expense (no-op).
 */
export async function unmarkItemPurchased(itemId: string) {
  const userId = await getUserId()

  // Verify the item belongs to a list owned by this user.
  const rows = await db.select({
    item: shoppingListItems,
    listOwner: shoppingLists.userId,
  })
    .from(shoppingListItems)
    .leftJoin(shoppingLists, eq(shoppingListItems.shoppingListId, shoppingLists.id))
    .where(eq(shoppingListItems.id, itemId))
    .limit(1)

  const row = rows[0]
  if (!row || row.listOwner !== userId) throw new Error('Item not found')
  const { item } = row

  if (item.status !== 'purchased') {
    return { reverted: false, reason: 'not_purchased' }
  }

  // Flip status first so the linked expense doesn't get re-created by a racing
  // markItemPurchased — that one would now hit a row with status='pending' and
  // start fresh. Acceptable: undo + redo creates a new expense (correct behaviour).
  await db.update(shoppingListItems)
    .set({ status: 'pending', purchasedAt: null, expenseId: null })
    .where(eq(shoppingListItems.id, itemId))

  if (item.expenseId) {
    await deleteExpense(item.expenseId).catch(err => {
      console.error('[unmarkItemPurchased] expense delete failed:', err)
    })
  }

  return { reverted: true, deletedExpenseId: item.expenseId }
}

export async function updateShoppingListItem(itemId: string, data: {
  description?: string; quantity?: string; unit?: string; estimatedCost?: string
}) {
  const userId = await getUserId()

  const rows = await db.select({ item: shoppingListItems, listOwner: shoppingLists.userId })
    .from(shoppingListItems)
    .leftJoin(shoppingLists, eq(shoppingListItems.shoppingListId, shoppingLists.id))
    .where(eq(shoppingListItems.id, itemId))
    .limit(1)
  const row = rows[0]
  if (!row || row.listOwner !== userId) throw new Error('Item not found')

  const merged = {
    description: data.description ?? row.item.description,
    quantity: data.quantity ?? row.item.quantity ?? undefined,
    unit: data.unit ?? row.item.unit ?? undefined,
    estimatedCost: data.estimatedCost ?? row.item.estimatedCost,
  }
  const clean = validateItemInput(merged)

  const updates: Record<string, unknown> = {}
  if (data.description !== undefined) updates.description = clean.description
  if (data.quantity !== undefined) updates.quantity = clean.quantity
  if (data.unit !== undefined) updates.unit = clean.unit
  if (data.estimatedCost !== undefined) updates.estimatedCost = clean.estimatedCost
  if (Object.keys(updates).length === 0) return

  await db.update(shoppingListItems)
    .set(updates)
    .where(eq(shoppingListItems.id, itemId))
}

export async function deleteShoppingListItem(itemId: string) {
  const userId = await getUserId()

  const rows = await db.select({ item: shoppingListItems, listOwner: shoppingLists.userId })
    .from(shoppingListItems)
    .leftJoin(shoppingLists, eq(shoppingListItems.shoppingListId, shoppingLists.id))
    .where(eq(shoppingListItems.id, itemId))
    .limit(1)
  const row = rows[0]
  if (!row || row.listOwner !== userId) throw new Error('Item not found')

  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId))
  return row.item.expenseId ?? null
}

// ── Share ──

export async function generateShareToken(listId: string) {
  const userId = await getUserId()
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  await db.update(shoppingLists)
    .set({ shareToken: token })
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
  return token
}

export async function getShoppingListByToken(token: string) {
  const [list] = await db.select().from(shoppingLists)
    .where(eq(shoppingLists.shareToken, token))
    .limit(1)
  if (!list) return null

  const items = await db.select().from(shoppingListItems)
    .where(eq(shoppingListItems.shoppingListId, list.id))
    .orderBy(shoppingListItems.sortOrder)

  return { ...list, items }
}

// ── Estimate → Shopping List ──

/**
 * Generate a shopping list from the material line items of an estimate.
 * Skips line items that are not type='material' or have no description.
 * Links the new list to the estimate's job (if any).
 *
 * Returns null if the estimate has no eligible material items.
 */
export async function createShoppingListFromEstimate(estimateId: string) {
  const userId = await getUserId()
  const { dbAdapter } = await import('@/lib/adapters/db')

  const estimate = await dbAdapter.estimates.findById(estimateId, userId)
  if (!estimate) throw new Error('Estimate not found')

  const lineItems = await dbAdapter.lineItems.findByParent(estimateId, 'estimate')
  const materials = lineItems.filter(li => li.type === 'material' && li.description?.trim().length)

  if (materials.length === 0) {
    return { created: false, reason: 'no_materials' as const }
  }

  const itemsInput = materials.map(li => {
    const qty = parseFloat(li.quantity ?? '1')
    const unitPrice = parseFloat(li.unitPrice ?? '0')
    const estimatedCost = Number.isFinite(qty * unitPrice) ? qty * unitPrice : 0
    return {
      description: li.description,
      quantity: li.quantity,
      unit: undefined,
      estimatedCost: String(estimatedCost.toFixed(2)),
    }
  })

  const list = await createShoppingList({
    name: `Materials — ${estimate.clientName} (${estimate.number})`,
    jobId: estimate.jobId ?? undefined,
    items: itemsInput,
  })

  return { created: true as const, list }
}
