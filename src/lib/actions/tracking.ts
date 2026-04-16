'use server'

import { dbAdapter } from '@/lib/adapters/db'

export async function recordDocumentView(data: {
  userId: string
  documentId: string
  documentType: string
  ip?: string
  userAgent?: string
}) {
  // Is this the first view? If yes, create a notification for the contractor
  // so they see "client opened your estimate/invoice" in-app in real time.
  const priorCount = await dbAdapter.documentViews.countByDocument(data.documentId, data.documentType).catch(() => 0)

  const view = await dbAdapter.documentViews.create({
    userId: data.userId,
    documentId: data.documentId,
    documentType: data.documentType,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
  })

  if (priorCount === 0) {
    try {
      const [estimate, invoice] = await Promise.all([
        data.documentType === 'estimate' ? dbAdapter.estimates.findById(data.documentId, data.userId).catch(() => null) : null,
        data.documentType === 'invoice' ? dbAdapter.invoices.findById(data.documentId, data.userId).catch(() => null) : null,
      ])
      const doc = estimate ?? invoice
      if (doc) {
        const label = data.documentType === 'estimate' ? 'estimate' : 'invoice'
        await dbAdapter.notifications.create(data.userId, {
          type: 'document_viewed',
          title: `${doc.clientName} opened ${label} ${doc.number}`,
          body: `Client viewed this ${label} for the first time.`,
          href: `/en/${data.documentType}s/${doc.id}`,
          read: false,
        })
      }
    } catch (err) {
      console.error('[tracking] first-view notification failed:', err)
    }
  }

  return view
}

export async function getDocumentViews(documentId: string, documentType: string) {
  return dbAdapter.documentViews.findByDocument(documentId, documentType)
}

export async function getDocumentViewCount(documentId: string, documentType: string) {
  return dbAdapter.documentViews.countByDocument(documentId, documentType)
}
