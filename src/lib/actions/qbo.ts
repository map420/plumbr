'use server'
import { requireUser as requireAuth } from './auth-helpers'

export async function getQboStatus() {
  const userId = await requireAuth()
  // TODO: Check if QBO connection exists and is valid
  return { connected: false, realmId: null }
}

export async function disconnectQbo() {
  const userId = await requireAuth()
  // TODO: Delete QBO connection
}
