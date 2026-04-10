'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getJob, Job, JobStatus } from '@/lib/store/jobs'
import { JobForm } from './JobForm'

type FormTranslations = {
  save: string; cancel: string
  fields: Record<string, string>
  status: Record<JobStatus, string>
}

export function JobEditClient({ translations }: { translations: FormTranslations }) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    const j = getJob(id)
    if (!j) { router.push(`/${locale}/jobs`); return }
    setJob(j)
  }, [id, locale, router])

  if (!job) return null
  return <JobForm translations={translations} job={job} />
}
