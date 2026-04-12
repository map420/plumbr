import { notFound } from 'next/navigation'
import { getTechnicians } from '@/lib/actions/technicians'
import { getExpensesByTechnician } from '@/lib/actions/expenses'
import { getJobs } from '@/lib/actions/jobs'
import { TechnicianProfileClient } from './_components/TechnicianProfileClient'

export default async function TechnicianProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const [technicians, laborExpenses, allJobs] = await Promise.all([
    getTechnicians(),
    getExpensesByTechnician(id),
    getJobs(),
  ])

  const technician = technicians.find(t => t.id === id)
  if (!technician) notFound()

  // Filter jobs that have labor expenses from this technician
  const jobIdsWithLabor = [...new Set(laborExpenses.map(e => e.jobId))]
  const relevantJobs = allJobs.filter(j => jobIdsWithLabor.includes(j.id))

  return (
    <TechnicianProfileClient
      technician={technician}
      laborExpenses={laborExpenses}
      jobs={relevantJobs}
      locale={locale}
    />
  )
}
