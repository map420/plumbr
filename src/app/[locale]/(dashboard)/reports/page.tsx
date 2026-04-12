import { getReportsData } from '@/lib/actions/reports'
import { ReportsClient } from './_components/ReportsClient'

export default async function ReportsPage() {
  const data = await getReportsData()
  return <ReportsClient data={data} />
}
