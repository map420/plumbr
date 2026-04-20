'use client'

import { useParams, useRouter } from 'next/navigation'
import { JobForm } from './JobForm'

type Job = { id: string; name: string; clientId: string | null; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string | null; actualCost: string | null; startDate: Date | null; endDate: Date | null; notes: string | null }
type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null }
type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type FormTranslations = { save: string; cancel: string; fields: Record<string, string>; status: Record<JobStatus, string> }

export function JobEditClient({ job, translations, clients }: { job: Job; translations: FormTranslations; clients?: Client[] }) {
  return <JobForm translations={translations} job={job} clients={clients} />
}
