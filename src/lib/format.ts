/**
 * Number/currency formatters. Use these instead of calling `toLocaleString()`
 * inline so the whole app renders money consistently.
 *
 * Single currency (USD) and single locale (en-US) is deliberate: the product is
 * US-facing regardless of the UI locale the contractor chose. Money is a
 * universal display format for the contractor — swap locale here when/if the
 * product launches in other currencies.
 */

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const USD_COMPACT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** `$1,234.56` — precise display for totals and line items. */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '$0.00'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!Number.isFinite(n)) return '$0.00'
  return USD.format(n)
}

/** `$1,234` — coarse display for dashboard cards where cents are noise. */
export function formatCurrencyCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '$0'
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!Number.isFinite(n)) return '$0'
  return USD_COMPACT.format(n)
}
