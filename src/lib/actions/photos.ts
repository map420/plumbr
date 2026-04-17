'use server'

import { revalidatePath } from 'next/cache'
import { dbAdapter } from '@/lib/adapters/db'
import { requireUser as requireAuth } from './auth-helpers'
import { getUserPlan } from './billing'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'

export async function getPhotosByJob(jobId: string) {
  await requireAuth()
  return dbAdapter.photos.findByJob(jobId)
}

export async function getPhotosByEstimate(estimateId: string) {
  await requireAuth()
  return dbAdapter.photos.findByEstimate(estimateId)
}

export async function getPhotosByLineItem(lineItemId: string) {
  await requireAuth()
  return dbAdapter.photos.findByLineItem(lineItemId)
}

export async function createPhoto(data: {
  jobId?: string; estimateId?: string; lineItemId?: string
  description?: string; url: string; thumbnailUrl?: string
}) {
  const userId = await requireAuth()

  // Plan gating: free tier limited to 5 photos
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    // Count all photos across jobs and estimates
    const allJobs = await dbAdapter.jobs.findAll(userId)
    let totalPhotos = 0
    for (const job of allJobs) {
      const jobPhotos = await dbAdapter.photos.findByJob(job.id)
      totalPhotos += jobPhotos.length
    }
    if (totalPhotos >= STARTER_LIMITS.photos) {
      throw new Error(`PLAN_LIMIT: Upgrade to Pro to upload more than ${STARTER_LIMITS.photos} photos.`)
    }
  }

  const photo = await dbAdapter.photos.create(userId, {
    jobId: data.jobId || null,
    estimateId: data.estimateId || null,
    lineItemId: data.lineItemId || null,
    description: data.description || null,
    url: data.url,
    thumbnailUrl: data.thumbnailUrl || null,
    sortOrder: 0,
  })

  revalidatePath('/[locale]/jobs', 'page')
  revalidatePath('/[locale]/estimates', 'page')
  return photo
}

export async function deletePhoto(id: string) {
  const userId = await requireAuth()
  await dbAdapter.photos.delete(id, userId)
  revalidatePath('/[locale]/jobs', 'page')
  revalidatePath('/[locale]/estimates', 'page')
}
