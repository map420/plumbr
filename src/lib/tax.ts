/**
 * Tax rate utilities.
 *
 * User tax rate is stored in `users.taxRate` as a string percent ("8.25" means 8.25%).
 * Null/undefined/empty/invalid → 0 (no tax applied).
 *
 * Prior behaviour hardcoded 10% in EstimateFormClient.tsx — this module replaces it.
 */

/** Parse a stored tax rate string ("8.25") into a decimal multiplier (0.0825). */
export function parseTaxRate(rate: string | null | undefined): number {
  if (!rate) return 0
  const parsed = parseFloat(rate)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed / 100
}

/** Same as parseTaxRate but keeps the percent form (8.25). Useful for display labels. */
export function parseTaxPercent(rate: string | null | undefined): number {
  if (!rate) return 0
  const parsed = parseFloat(rate)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

/** Compute tax amount for a given subtotal and stored tax rate string. Rounded to cents. */
export function calculateTax(amount: number, rate: string | null | undefined): number {
  const decimal = parseTaxRate(rate)
  return Math.round(amount * decimal * 100) / 100
}
