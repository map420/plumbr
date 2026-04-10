export function getAll<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export function nextNumber(prefix: string, key: string): string {
  const items = getAll<{ number: string }>(key)
  const max = items.reduce((acc, item) => {
    const n = parseInt(item.number.replace(prefix + '-', ''), 10)
    return isNaN(n) ? acc : Math.max(acc, n)
  }, 0)
  return `${prefix}-${String(max + 1).padStart(3, '0')}`
}
