/** Formatting & validation helpers for Settings forms */

export function formatEIN(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

export function isValidEIN(v: string): boolean {
  return /^\d{2}-\d{7}$/.test(v)
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  // North American format: +1 (XXX) XXX-XXXX
  const d = digits.startsWith('1') ? digits.slice(1) : digits
  if (d.length <= 3) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
}

export function formatZip(raw: string): string {
  return raw.replace(/[^\d-]/g, '').slice(0, 10)
}
