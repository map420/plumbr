import { pgTable, text, timestamp, varchar, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const documentViews = pgTable('document_views', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: text('document_id').notNull(),
  documentType: varchar('document_type', { length: 20 }).notNull(), // 'estimate' | 'invoice'
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  ip: varchar('ip', { length: 50 }),
  userAgent: text('user_agent'),
}, (t) => [
  // Composite index supports both single-doc lookup and bulk inArray lookups.
  index('document_views_doc_idx').on(t.documentId, t.documentType),
])

export type DocumentView = typeof documentViews.$inferSelect
export type NewDocumentView = typeof documentViews.$inferInsert
