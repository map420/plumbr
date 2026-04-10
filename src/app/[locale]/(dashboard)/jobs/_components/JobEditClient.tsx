'use client'

import { useParams, useRouter } from 'next/navigation'
import { JobForm } from './JobForm'

type Job = { id: string; name: string; clientName: string; clientEmail: string | null; clientPhone: string | null; address: string | null; status: string; budgetedCost: string | null; actualCost: string | null; startDate: Date | null; endDate: Date | null; notes: string | null }
type JobStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
type FormTranslations = { save: string; cancel: string; fields: Record<string, string>; status: Record<JobStatus, string> }

export function JobEditClient({ job, translations }: { job: Job; translations: FormTranslations }) {
  return <JobForm translations={translations} job={job} />
}
