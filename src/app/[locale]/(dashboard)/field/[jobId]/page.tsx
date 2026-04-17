import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getJob, updateJob } from '@/lib/actions/jobs'
import { getWorkOrdersByJob } from '@/lib/actions/work-orders'
import { FieldJobClient } from './_components/FieldJobClient'

export default async function FieldJobPage({ params }: { params: Promise<{ jobId: string; locale: string }> }) {
  const { jobId, locale } = await params
  const [t, tj, job, workOrders] = await Promise.all([
    getTranslations('field'), getTranslations('jobs'), getJob(jobId), getWorkOrdersByJob(jobId),
  ])
  if (!job) notFound()

  return (
    <FieldJobClient
      job={job}
      locale={locale}
      workOrders={workOrders.map(wo => ({ id: wo.id, number: wo.number, title: wo.title, instructions: wo.instructions, status: wo.status }))}
      translations={{
        todaysJobs: t('todaysJobs'),
        checklist: t('checklist'),
        photos: t('photos'),
        uploadPhoto: t('uploadPhoto'),
        status: {
          lead: tj('status.lead'), active: tj('status.active'), on_hold: tj('status.on_hold'),
          completed: tj('status.completed'), cancelled: tj('status.cancelled'),
        },
      }}
    />
  )
}
