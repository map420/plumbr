import { getAll, saveAll, nextNumber } from '.'

const KEY = 'plumbr_estimates'
const LI_KEY = 'plumbr_line_items_estimate'

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted'
export type LineItemType = 'labor' | 'material' | 'subcontractor' | 'other'

export interface LineItem {
  id: string
  parentId: string
  type: LineItemType
  description: string
  quantity: number
  unitPrice: number
  total: number
  sortOrder: number
}

export interface Estimate {
  id: string
  jobId: string
  number: string
  clientName: string
  clientEmail: string
  status: EstimateStatus
  subtotal: number
  tax: number
  total: number
  notes: string
  validUntil: string
  convertedToInvoiceId: string
  createdAt: string
  updatedAt: string
}

export function getEstimates(): Estimate[] {
  return getAll<Estimate>(KEY).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getEstimate(id: string): Estimate | undefined {
  return getAll<Estimate>(KEY).find((e) => e.id === id)
}

export function getEstimatesByJob(jobId: string): Estimate[] {
  return getAll<Estimate>(KEY).filter((e) => e.jobId === jobId)
}

export function getLineItems(estimateId: string): LineItem[] {
  return getAll<LineItem>(LI_KEY)
    .filter((li) => li.parentId === estimateId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function createEstimate(
  data: Omit<Estimate, 'id' | 'number' | 'createdAt' | 'updatedAt'>,
  lineItems: Omit<LineItem, 'id' | 'parentId'>[]
): Estimate {
  const estimates = getAll<Estimate>(KEY)
  const estimate: Estimate = {
    ...data,
    id: crypto.randomUUID(),
    number: nextNumber('EST', KEY),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveAll(KEY, [...estimates, estimate])
  saveLineItems(estimate.id, lineItems)
  return estimate
}

export function updateEstimate(id: string, data: Partial<Omit<Estimate, 'id' | 'createdAt'>>): Estimate {
  const estimates = getAll<Estimate>(KEY)
  const index = estimates.findIndex((e) => e.id === id)
  if (index === -1) throw new Error('Estimate not found')
  estimates[index] = { ...estimates[index], ...data, updatedAt: new Date().toISOString() }
  saveAll(KEY, estimates)
  return estimates[index]
}

export function saveLineItems(estimateId: string, items: Omit<LineItem, 'id' | 'parentId'>[]): void {
  const all = getAll<LineItem>(LI_KEY).filter((li) => li.parentId !== estimateId)
  const newItems: LineItem[] = items.map((item, i) => ({
    ...item,
    id: crypto.randomUUID(),
    parentId: estimateId,
    sortOrder: i,
  }))
  saveAll(LI_KEY, [...all, ...newItems])
}

export function deleteEstimate(id: string): void {
  saveAll(KEY, getAll<Estimate>(KEY).filter((e) => e.id !== id))
  saveAll(LI_KEY, getAll<LineItem>(LI_KEY).filter((li) => li.parentId !== id))
}
