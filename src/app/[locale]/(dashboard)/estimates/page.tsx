import { getTranslations } from 'next-intl/server'
import { getEstimates } from '@/lib/actions/estimates'
import { getUserPlan } from '@/lib/actions/billing'
import { isPro, STARTER_LIMITS } from '@/lib/stripe'
import { dbAdapter } from '@/lib/adapters/db'
import { EstimatesClient } from './_components/EstimatesClient'

export default async function EstimatesPage() {
  const [t, estimates, planData] = await Promise.all([getTranslations('estimates'), getEstimates(), getUserPlan()])
  const pro = isPro(planData?.plan)

  // Single-query bulk fetch. Replaces a serialized for-loop that fired one
  // DB round-trip per estimate (50 estimates ≈ 5-8s vs one ~40ms query).
  const viewCounts = await dbAdapter.documentViews
    .countByDocumentsBatch(estimates.map(e => e.id), 'estimate')
    .catch(() => ({} as Record<string, number>))

  return (
    <EstimatesClient
      initialEstimates={estimates}
      viewCounts={viewCounts}
      planInfo={pro ? null : { current: estimates.length, limit: STARTER_LIMITS.estimates }}
      translations={{
        title: t('title'), new: t('new'), empty: t('empty'),
        status: { draft: t('status.draft'), sent: t('status.sent'), approved: t('status.approved'), rejected: t('status.rejected'), converted: t('status.converted'), expired: t('status.expired') },
        fields: { number: t('fields.number'), clientName: t('fields.clientName'), total: t('fields.total') },
      }}
    />
  )
}
