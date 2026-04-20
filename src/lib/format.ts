/**
 * Number formatters for money display. Use these instead of calling
 * `toLocaleString()` inline — eliminates the "$135,00" (European-locale)
 * vs "$1360.00" (no thousand-sep) inconsistency across the app.
 *
 * Returns the NUMBER only (no $ sign) because JSX templates already
 * prefix with `$`. Example: `$${fmt(amount)}` → `$1,234.56`.
 */

function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

function intlFor(locale: string | undefined, fractionDigits: number): Intl.NumberFormat {
  const bcp = locale === 'es' ? 'es-ES' : 'en-US'
  return new Intl.NumberFormat(bcp, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

/** `1,234.56` (en) · `1.234,56` (es) — precise display for totals and line items. */
export function formatCurrency(amount: number | string | null | undefined, locale?: string): string {
  return intlFor(locale, 2).format(toNum(amount))
}

/** `1,234` (en) · `1.234` (es) — coarse display for dashboard cards where cents are noise. */
export function formatCurrencyCompact(amount: number | string | null | undefined, locale?: string): string {
  return intlFor(locale, 0).format(toNum(amount))
}

/** BCP-47 tag for date formatters. Centraliza el mapeo locale-key → Intl-locale. */
export function localeTag(locale: string | undefined): string {
  return locale === 'es' ? 'es-ES' : 'en-US'
}

/**
 * Parse "YYYY-MM-DD" (from <input type="date">) como **mediodía UTC**.
 * `new Date("YYYY-MM-DD")` parsea como UTC midnight → en TZ negativas (América)
 * el día visible se desplaza al anterior. Esto es un bug clásico de date-only fields
 * cuando el server y el cliente están en TZ distintas.
 *
 * Truco estándar: almacenar al mediodía UTC (12:00Z). Cualquier TZ del mundo
 * (UTC-12 a UTC+14) interpreta ese instante como el MISMO día calendario.
 * Usar este helper siempre para fechas que representan un "día calendario",
 * no un instante de tiempo (startDate, endDate, validUntil, dueDate, expense.date).
 */
/**
 * Build a public portal URL respetando el locale del contractor → cliente
 * recibe el link con la misma UI. Antes había 5 lugares con `/en/portal/` hardcoded.
 */
export function portalUrl(origin: string, locale: string, token: string): string {
  const loc = locale === 'es' ? 'es' : 'en'
  return `${origin}/${loc}/portal/${token}`
}

/**
 * Suma el `amount` de expenses cuya fecha ya ocurrió (<= hoy).
 * Expenses con `date` futuro son "proyecciones", NO gasto real — no deben inflar
 * actualCost / margin / over-budget flags. (A5 fix, previously JobDetail only.)
 */
export function sumActualExpenses(
  expenses: { amount: string | number; date?: Date | string | null }[],
  now: Date = new Date(),
): number {
  const nowMs = now.getTime()
  return expenses
    .filter(e => !e.date || new Date(e.date).getTime() <= nowMs)
    .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : parseFloat(e.amount) || 0), 0)
}

export function parseDateOnly(str: string | null | undefined): Date | null {
  if (!str) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str)
  if (!match) return new Date(str) // fallback para strings ISO con hora
  const [, y, m, d] = match
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0))
}
