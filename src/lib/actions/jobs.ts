'use server'

import { dbAdapter } from '@/lib/adapters/db'
import { emailAdapter } from '@/lib/adapters/email'
import { revalidatePath } from 'next/cache'
import { jobCompletedInvoiceDueEmail } from '@/lib/email-templates'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { getUserPlan } from './billing'
import { requireUser as requireAuth } from './auth-helpers'

export async function getJobs() {
  const userId = await requireAuth()
  return dbAdapter.jobs.findAll(userId)
}

export async function getJob(id: string) {
  const userId = await requireAuth()
  return dbAdapter.jobs.findById(id, userId)
}

export async function createJob(data: {
  name: string; clientId?: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}) {
  const userId = await requireAuth()

  // Validation
  if (!data.name?.trim() || data.name.trim().length < 2) throw new Error('Job name must be at least 2 characters.')
  if (!data.clientName?.trim() || data.clientName.trim().length < 2) throw new Error('Client name must be at least 2 characters.')
  if (data.endDate && data.startDate && new Date(data.endDate) < new Date(data.startDate)) throw new Error('End date cannot be before start date.')

  // Plan enforcement
  const planData = await getUserPlan()
  if (!isPro(planData?.plan)) {
    const existing = await dbAdapter.jobs.findAll(userId)
    if (existing.length >= STARTER_LIMITS.jobs) {
      throw new Error(`PLAN_LIMIT: Upgrade to Pro to create more than ${STARTER_LIMITS.jobs} jobs.`)
    }
  }
  const job = await dbAdapter.jobs.create(userId, {
    clientId: data.clientId || null,
    name: data.name,
    clientName: data.clientName,
    clientEmail: data.clientEmail || null,
    clientPhone: data.clientPhone || null,
    address: data.address || null,
    status: data.status as 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled',
    budgetedCost: data.budgetedCost || '0',
    actualCost: data.actualCost || '0',
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    notes: data.notes || null,
  })
  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function updateJob(id: string, data: Partial<{
  name: string; clientId: string; clientName: string; clientEmail: string; clientPhone: string
  address: string; status: string; budgetedCost: string; actualCost: string
  startDate: string; endDate: string; notes: string
}>) {
  const userId = await requireAuth()
  const previous = await dbAdapter.jobs.findById(id, userId)

  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.clientId !== undefined) patch.clientId = data.clientId || null
  if (data.clientName !== undefined) patch.clientName = data.clientName
  if (data.clientEmail !== undefined) patch.clientEmail = data.clientEmail || null
  if (data.clientPhone !== undefined) patch.clientPhone = data.clientPhone || null
  if (data.address !== undefined) patch.address = data.address || null
  if (data.status !== undefined) patch.status = data.status
  if (data.budgetedCost !== undefined) patch.budgetedCost = data.budgetedCost
  if (data.actualCost !== undefined) patch.actualCost = data.actualCost
  if (data.startDate !== undefined) patch.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.endDate !== undefined) patch.endDate = data.endDate ? new Date(data.endDate) : null
  if (data.notes !== undefined) patch.notes = data.notes || null

  const job = await dbAdapter.jobs.update(id, userId, patch as Parameters<typeof dbAdapter.jobs.update>[2])

  // Automation #4 — Job → Completed + has Draft invoice → notify contractor
  if (data.status === 'completed' && previous?.status !== 'completed') {
    const contractorUser = await dbAdapter.users.findById(userId)
    if (contractorUser?.email) {
      const invoices = await dbAdapter.invoices.findByJob(id, userId)
      const draftInvoice = invoices.find(inv => inv.status === 'draft')
      if (draftInvoice) {
        const appUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://plumbr.vercel.app'}/en/invoices/${draftInvoice.id}`
        await emailAdapter.send({
          to: contractorUser.email,
          subject: `Job "${job.name}" completed — invoice ready to send`,
          html: jobCompletedInvoiceDueEmail({
            contractorEmail: contractorUser.email,
            jobName: job.name,
            clientName: job.clientName,
            invoiceNumber: draftInvoice.number,
            total: draftInvoice.total,
            appUrl,
          }),
        }).catch(err => console.error('[AUTO #4] email failed:', err))
      }
    }
  }

  revalidatePath('/[locale]/jobs', 'page')
  return job
}

export async function deleteJob(id: string) {
  const userId = await requireAuth()
  await dbAdapter.jobs.delete(id, userId)
  revalidatePath('/[locale]/jobs', 'page')
}
