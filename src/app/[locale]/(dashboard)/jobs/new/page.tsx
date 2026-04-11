import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/actions/clients'
import { JobForm } from '../_components/JobForm'

export default async function NewJobPage() {
  const [tj, tc, clients] = await Promise.all([getTranslations('jobs'), getTranslations('common'), getClients()])
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{tj('new')}</h1>
      <JobForm
        clients={clients}
        translations={{
          save: tc('save'),
          cancel: tc('cancel'),
          fields: {
            name: tj('fields.name'),
            clientName: tj('fields.clientName'),
            clientEmail: tj('fields.clientEmail'),
            clientPhone: tj('fields.clientPhone'),
            address: tj('fields.address'),
            startDate: tj('fields.startDate'),
            endDate: tj('fields.endDate'),
            notes: tj('fields.notes'),
            budgetedCost: tj('fields.budgetedCost'),
          },
          status: {
            lead: tj('status.lead'),
            active: tj('status.active'),
            on_hold: tj('status.on_hold'),
            completed: tj('status.completed'),
            cancelled: tj('status.cancelled'),
          },
        }}
      />
    </div>
  )
}
