import { getTranslations } from 'next-intl/server'
import { getJobs } from '@/lib/actions/jobs'
import { getTechnicians } from '@/lib/actions/technicians'
import { dbAdapter } from '@/lib/adapters/db'
import { authAdapter } from '@/lib/adapters/auth'
import { FieldClient } from './_components/FieldClient'

export default async function FieldPage({ searchParams }: { searchParams: Promise<{ tech?: string }> }) {
  const { tech: techId } = await searchParams
  const [t, tj, allJobs, technicians] = await Promise.all([
    getTranslations('field'), getTranslations('jobs'), getJobs(), getTechnicians(),
  ])

  let jobs = allJobs
  // If a techId is selected, filter to only jobs assigned to that technician
  if (techId) {
    const userId = await authAdapter.getUserId()
    if (userId) {
      const jobIds = await dbAdapter.technicians.findJobsByTechnician(techId)
      jobs = allJobs.filter(j => jobIds.includes(j.id))
    }
  }

  return (
    <FieldClient
      initialJobs={jobs}
      technicians={technicians}
      selectedTechId={techId ?? null}
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
