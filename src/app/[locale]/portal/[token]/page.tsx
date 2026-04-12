import { notFound } from 'next/navigation'
import { getPortalData } from '@/lib/actions/portal'
import { PortalClient } from './_components/PortalClient'

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  return <PortalClient token={token} data={data} />
}
