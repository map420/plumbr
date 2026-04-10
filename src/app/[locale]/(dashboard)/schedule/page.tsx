import { getTranslations } from 'next-intl/server'
import { getJobs } from '@/lib/actions/jobs'
import { ScheduleClient } from './_components/ScheduleClient'

export default async function SchedulePage() {
  const [t, tj, jobs] = await Promise.all([getTranslations('schedule'), getTranslations('jobs'), getJobs()])
  return (
    <ScheduleClient
      initialJobs={jobs}
      translations={{
        title: t('title'),
        today: t('today'),
        noJobs: t('noJobs'),
        status: {
          lead: tj('status.lead'), active: tj('status.active'), on_hold: tj('status.on_hold'),
          completed: tj('status.completed'), cancelled: tj('status.cancelled'),
        },
      }}
    />
  )
}
