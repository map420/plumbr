import { getTranslations } from 'next-intl/server'
import { getJobs } from '@/lib/actions/jobs'
import { getUserPlan } from '@/lib/actions/billing'
import { getAllJobAssignments } from '@/lib/actions/technicians'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { JobsClient } from './_components/JobsClient'

export default async function JobsPage() {
  const [t, jobs, planData, assignments] = await Promise.all([getTranslations('jobs'), getJobs(), getUserPlan(), getAllJobAssignments()])
  const pro = isPro(planData?.plan)
  return (
    <JobsClient
      initialJobs={jobs}
      jobAssignments={assignments}
      planInfo={pro ? null : { current: jobs.length, limit: STARTER_LIMITS.jobs }}
      translations={{
        title: t('title'), new: t('new'), empty: t('empty'),
        status: { lead: t('status.lead'), active: t('status.active'), on_hold: t('status.on_hold'), completed: t('status.completed'), cancelled: t('status.cancelled') },
        fields: { name: t('fields.name'), clientName: t('fields.clientName'), startDate: t('fields.startDate'), endDate: t('fields.endDate'), budgetedCost: t('fields.budgetedCost') },
      }}
    />
  )
}
