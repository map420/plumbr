/**
 * Pure validators for the shopping-list domain.
 *
 * Throw `ValidationError` so server actions can rethrow with a structured
 * message the UI can display. Don't add Zod or any runtime dep — these rules
 * are simple and live well in plain TS.
 */

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(`VALIDATION: ${message}`)
    this.name = 'ValidationError'
  }
}

const MAX_NAME = 255
const MAX_DESCRIPTION = 500
const MAX_UNIT = 50
const MAX_ITEMS_PER_LIST = 200
const MAX_COST = 10_000_000 // ten million cents-of-dollars sanity ceiling

function trim(v: string | null | undefined): string {
  return (v ?? '').trim()
}

function parseAmount(v: string | number | null | undefined, field: string): number {
  if (v === null || v === undefined || v === '') {
    throw new ValidationError(`${field} is required`, field)
  }
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`, field)
  if (n < 0) throw new ValidationError(`${field} cannot be negative`, field)
  if (n > MAX_COST) throw new ValidationError(`${field} is unrealistically large`, field)
  return n
}

function parseOptionalQuantity(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!Number.isFinite(n)) throw new ValidationError('quantity must be a number', 'quantity')
  if (n < 0) throw new ValidationError('quantity cannot be negative', 'quantity')
  return String(n)
}

export function validateListName(raw: string): string {
  const name = trim(raw)
  if (name.length === 0) throw new ValidationError('List name is required', 'name')
  if (name.length > MAX_NAME) throw new ValidationError(`List name exceeds ${MAX_NAME} chars`, 'name')
  return name
}

export type CleanItemInput = {
  description: string
  quantity: string | null
  unit: string | null
  estimatedCost: string
}

export function validateItemInput(raw: {
  description?: string
  quantity?: string | number | null
  unit?: string | null
  estimatedCost?: string | number | null
}): CleanItemInput {
  const description = trim(raw.description)
  if (description.length === 0) throw new ValidationError('Description is required', 'description')
  if (description.length > MAX_DESCRIPTION) {
    throw new ValidationError(`Description exceeds ${MAX_DESCRIPTION} chars`, 'description')
  }

  const unit = trim(raw.unit ?? '') || null
  if (unit && unit.length > MAX_UNIT) {
    throw new ValidationError(`Unit exceeds ${MAX_UNIT} chars`, 'unit')
  }

  const cost = parseAmount(raw.estimatedCost ?? null, 'estimatedCost')
  const qty = parseOptionalQuantity(raw.quantity ?? null)

  return {
    description,
    quantity: qty,
    unit,
    estimatedCost: String(cost),
  }
}

export function validateItemBatch(items: unknown[]): CleanItemInput[] {
  if (!Array.isArray(items)) throw new ValidationError('items must be an array', 'items')
  if (items.length > MAX_ITEMS_PER_LIST) {
    throw new ValidationError(`A list cannot exceed ${MAX_ITEMS_PER_LIST} items`, 'items')
  }
  return items.map(it => validateItemInput(it as any))
}

export const SHOPPING_LIST_LIMITS = {
  MAX_NAME,
  MAX_DESCRIPTION,
  MAX_UNIT,
  MAX_ITEMS_PER_LIST,
  MAX_COST,
}
