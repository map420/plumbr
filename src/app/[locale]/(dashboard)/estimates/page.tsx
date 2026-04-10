import { getTranslations } from 'next-intl/server'
import { getEstimates } from '@/lib/actions/estimates'
import { EstimatesClient } from './_components/EstimatesClient'

export default async function EstimatesPage() {
  const [t, estimates] = await Promise.all([getTranslations('estimates'), getEstimates()])
  return (
    <EstimatesClient
      initialEstimates={estimates}
      translations={{
        title: t('title'), new: t('new'), empty: t('empty'),
        status: { draft: t('status.draft'), sent: t('status.sent'), approved: t('status.approved'), rejected: t('status.rejected'), converted: t('status.converted') },
        fields: { number: t('fields.number'), clientName: t('fields.clientName'), total: t('fields.total') },
      }}
    />
  )
}
