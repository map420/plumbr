import { getTranslations } from 'next-intl/server'
import { getJobs } from '@/lib/actions/jobs'
import { FieldClient } from './_components/FieldClient'

export default async function FieldPage() {
  const [t, tj, jobs] = await Promise.all([getTranslations('field'), getTranslations('jobs'), getJobs()])
  return (
    <FieldClient
      initialJobs={jobs}
      translations={{
        title: t('title'), todaysJobs: t('todaysJobs'), noJobs: t('noJobs'),
        status: {
          lead: tj('status.lead'), active: tj('status.active'), on_hold: tj('status.on_hold'),
          completed: tj('status.completed'), cancelled: tj('status.cancelled'),
        },
        fields: { address: tj('fields.address'), clientName: tj('fields.clientName') },
      }}
    />
  )
}
