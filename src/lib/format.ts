/**
 * Number formatters for money display. Use these instead of calling
 * `toLocaleString()` inline — eliminates the "$135,00" (European-locale)
 * vs "$1360.00" (no thousand-sep) inconsistency across the app.
 *
 * Returns the NUMBER only (no $ sign) because JSX templates already
 * prefix with `$`. Example: `$${fmt(amount)}` → `$1,234.56`.
 */

const FULL = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const COMPACT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

/** `1,234.56` — precise display for totals and line items. */
export function formatCurrency(amount: number | string | null | undefined): string {
  return FULL.format(toNum(amount))
}

/** `1,234` — coarse display for dashboard cards where cents are noise. */
export function formatCurrencyCompact(amount: number | string | null | undefined): string {
  return COMPACT.format(toNum(amount))
}
