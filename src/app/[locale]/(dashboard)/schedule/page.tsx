import { getTranslations } from 'next-intl/server'
import { getJobs } from '@/lib/actions/jobs'
import { requireUser } from '@/lib/actions/auth-helpers'
import { dbAdapter } from '@/lib/adapters/db'
import { ScheduleClient } from './_components/ScheduleClient'

export default async function SchedulePage() {
  const [t, tj, jobs, userId] = await Promise.all([getTranslations('schedule'), getTranslations('jobs'), getJobs(), requireUser()])
  const assignments = await dbAdapter.technicians.findAllJobAssignments(userId)
  return (
    <ScheduleClient
      initialJobs={jobs}
      techAssignments={assignments}
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
