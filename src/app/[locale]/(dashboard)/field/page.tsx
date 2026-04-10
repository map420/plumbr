import { getTranslations } from 'next-intl/server'
import { FieldClient } from './_components/FieldClient'

export default async function FieldPage() {
  const t = await getTranslations('field')
  const tj = await getTranslations('jobs')
  return (
    <FieldClient
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
