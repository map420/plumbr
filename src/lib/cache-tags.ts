// Central registry of cache tags used by unstable_cache wrappers. Server
// actions that mutate data import these helpers and call updateTag(tag).
// Keeping the tag names in one file avoids drift between the writer and the
// cache definition.
//
// Next 16 note: we use `updateTag` (not the older `revalidateTag`) because it
// enables read-your-own-writes from within server actions — the mutated data
// is visible on the next render in the same request chain.

import { updateTag } from 'next/cache'

export const dashboardTag = (userId: string) => `dashboard:${userId}`
export const aiContextTag = (userId: string) => `ai-context:${userId}`

/**
 * Invalidate per-user caches that depend on business data (jobs, estimates,
 * invoices, clients, expenses). Call from any server action that mutates
 * these entities — it's cheap (just tag writes, no DB calls).
 */
export function invalidateUserData(userId: string) {
  updateTag(dashboardTag(userId))
  updateTag(aiContextTag(userId))
}
