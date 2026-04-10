import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getJob } from '@/lib/actions/jobs'
import { JobEditClient } from '../../_components/JobEditClient'

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [tj, tc, job] = await Promise.all([getTranslations('jobs'), getTranslations('common'), getJob(id)])
  if (!job) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{tc('edit')}</h1>
      <JobEditClient
        job={job}
        translations={{
          save: tc('save'), cancel: tc('cancel'),
          fields: { name: tj('fields.name'), clientName: tj('fields.clientName'), clientEmail: tj('fields.clientEmail'), clientPhone: tj('fields.clientPhone'), address: tj('fields.address'), startDate: tj('fields.startDate'), endDate: tj('fields.endDate'), notes: tj('fields.notes'), budgetedCost: tj('fields.budgetedCost') },
          status: { lead: tj('status.lead'), active: tj('status.active'), on_hold: tj('status.on_hold'), completed: tj('status.completed'), cancelled: tj('status.cancelled') },
        }}
      />
    </div>
  )
}
