import { getTranslations } from 'next-intl/server'
import { getEstimates } from '@/lib/actions/estimates'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { EstimatesClient } from './_components/EstimatesClient'

export default async function EstimatesPage() {
  const [t, estimates, planData] = await Promise.all([getTranslations('estimates'), getEstimates(), getUserPlan()])
  const pro = isPro(planData?.plan)
  return (
    <EstimatesClient
      initialEstimates={estimates}
      planInfo={pro ? null : { current: estimates.length, limit: STARTER_LIMITS.estimates }}
      translations={{
        title: t('title'), new: t('new'), empty: t('empty'),
        status: { draft: t('status.draft'), sent: t('status.sent'), approved: t('status.approved'), rejected: t('status.rejected'), converted: t('status.converted') },
        fields: { number: t('fields.number'), clientName: t('fields.clientName'), total: t('fields.total') },
      }}
    />
  )
}
