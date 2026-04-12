'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'

export async function getNotifications(limit = 30) {
  const userId = await requireAuth()
  return dbAdapter.notifications.findByUser(userId, limit)
}

export async function getUnreadCount() {
  const userId = await requireAuth()
  return dbAdapter.notifications.countUnread(userId)
}

export async function markNotificationRead(id: string) {
  const userId = await requireAuth()
  await dbAdapter.notifications.markRead(id, userId)
}

export async function markAllNotificationsRead() {
  const userId = await requireAuth()
  await dbAdapter.notifications.markAllRead(userId)
}
