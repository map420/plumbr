import { getTechnicians } from '@/lib/actions/technicians'
import { TeamClient } from './_components/TeamClient'

export default async function TeamPage() {
  const technicians = await getTechnicians()
  return <TeamClient initialTechnicians={technicians} />
}
