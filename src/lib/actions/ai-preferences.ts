'use server'

import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { aiPreferences } from '@/db/schema/ai-preferences'
import { eq, and } from 'drizzle-orm'

async function getUserId() {
  const { userId } = await auth()
  if (!userId) throw new Error('Not authenticated')
  return userId
}

export async function getAiPreferences() {
  const userId = await getUserId()
  return db.select().from(aiPreferences).where(eq(aiPreferences.userId, userId))
}

export async function saveAiPreference(key: string, value: string, learnedFrom?: string) {
  const userId = await getUserId()

  // Upsert — update if key exists, create if not
  const existing = await db.select().from(aiPreferences)
    .where(and(eq(aiPreferences.userId, userId), eq(aiPreferences.key, key)))
    .limit(1)

  if (existing.length > 0) {
    await db.update(aiPreferences)
      .set({ value, learnedFrom: learnedFrom || existing[0].learnedFrom, updatedAt: new Date() })
      .where(eq(aiPreferences.id, existing[0].id))
    return existing[0]
  }

  const [pref] = await db.insert(aiPreferences).values({
    userId, key, value, learnedFrom: learnedFrom || null,
  }).returning()
  return pref
}

export async function deleteAiPreference(key: string) {
  const userId = await getUserId()
  await db.delete(aiPreferences)
    .where(and(eq(aiPreferences.userId, userId), eq(aiPreferences.key, key)))
}
