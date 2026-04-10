'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getEstimate, Estimate } from '@/lib/store/estimates'
import { EstimateFormClient } from '../../_components/EstimateFormClient'
import { useTranslations } from 'next-intl'

export default function EditEstimatePage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const id = params.id as string
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const te = useTranslations('estimates')
  const tc = useTranslations('common')
  const tj = useTranslations('jobs')

  useEffect(() => {
    const e = getEstimate(id)
    if (!e) { router.push(`/${locale}/estimates`); return }
    setEstimate(e)
  }, [id, locale, router])

  if (!estimate) return null

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{tc('edit')} {estimate.number}</h1>
      <EstimateFormClient
        estimate={estimate}
        translations={{
          save: tc('save'), cancel: tc('cancel'),
          fields: {
            clientName: te('fields.clientName'), clientEmail: te('fields.clientEmail'),
            validUntil: te('fields.validUntil'), notes: te('fields.notes'),
            subtotal: te('fields.subtotal'), tax: te('fields.tax'), total: te('fields.total'),
          },
          lineItems: {
            title: te('lineItems.title'), add: te('lineItems.add'),
            type: {
              labor: te('lineItems.type.labor'), material: te('lineItems.type.material'),
              subcontractor: te('lineItems.type.subcontractor'), other: te('lineItems.type.other'),
            },
            fields: {
              description: te('lineItems.fields.description'), quantity: te('lineItems.fields.quantity'),
              unitPrice: te('lineItems.fields.unitPrice'), total: te('lineItems.fields.total'),
            },
          },
          job: tj('title'),
        }}
      />
    </div>
  )
}
