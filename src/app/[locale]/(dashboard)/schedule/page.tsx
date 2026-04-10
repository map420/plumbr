import { getTranslations } from 'next-intl/server'
import { ScheduleClient } from './_components/ScheduleClient'

export default async function SchedulePage() {
  const t = await getTranslations('schedule')
  const tj = await getTranslations('jobs')
  return (
    <ScheduleClient
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
