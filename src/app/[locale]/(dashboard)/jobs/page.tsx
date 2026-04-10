import { getTranslations } from 'next-intl/server'
import { JobsClient } from './_components/JobsClient'

export default async function JobsPage() {
  const t = await getTranslations('jobs')
  return <JobsClient translations={{ title: t('title'), new: t('new'), empty: t('empty'), status: { lead: t('status.lead'), active: t('status.active'), on_hold: t('status.on_hold'), completed: t('status.completed'), cancelled: t('status.cancelled') }, fields: { name: t('fields.name'), clientName: t('fields.clientName'), startDate: t('fields.startDate'), budgetedCost: t('fields.budgetedCost') } }} />
}
