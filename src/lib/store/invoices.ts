import { getAll, saveAll, nextNumber } from '.'
import { LineItem } from './estimates'

const KEY = 'plumbr_invoices'
const LI_KEY = 'plumbr_line_items_invoice'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  jobId: string
  estimateId: string
  number: string
  clientName: string
  clientEmail: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  total: number
  dueDate: string
  paidAt: string
  notes: string
  createdAt: string
  updatedAt: string
}

export function getInvoices(): Invoice[] {
  return getAll<Invoice>(KEY).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getInvoice(id: string): Invoice | undefined {
  return getAll<Invoice>(KEY).find((i) => i.id === id)
}

export function getInvoicesByJob(jobId: string): Invoice[] {
  return getAll<Invoice>(KEY).filter((i) => i.jobId === jobId)
}

export function getInvoiceLineItems(invoiceId: string): LineItem[] {
  return getAll<LineItem>(LI_KEY)
    .filter((li) => li.parentId === invoiceId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function createInvoice(
  data: Omit<Invoice, 'id' | 'number' | 'createdAt' | 'updatedAt'>,
  lineItems: Omit<LineItem, 'id' | 'parentId'>[]
): Invoice {
  const invoices = getAll<Invoice>(KEY)
  const invoice: Invoice = {
    ...data,
    id: crypto.randomUUID(),
    number: nextNumber('INV', KEY),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveAll(KEY, [...invoices, invoice])
  const newItems: LineItem[] = lineItems.map((item, i) => ({
    ...item,
    id: crypto.randomUUID(),
    parentId: invoice.id,
    sortOrder: i,
  }))
  saveAll(LI_KEY, [...getAll<LineItem>(LI_KEY), ...newItems])
  return invoice
}

export function updateInvoice(id: string, data: Partial<Omit<Invoice, 'id' | 'createdAt'>>): Invoice {
  const invoices = getAll<Invoice>(KEY)
  const index = invoices.findIndex((i) => i.id === id)
  if (index === -1) throw new Error('Invoice not found')
  invoices[index] = { ...invoices[index], ...data, updatedAt: new Date().toISOString() }
  saveAll(KEY, invoices)
  return invoices[index]
}

export function isOverdue(invoice: Invoice): boolean {
  return (
    invoice.status === 'sent' &&
    !!invoice.dueDate &&
    new Date(invoice.dueDate) < new Date()
  )
}
