import { getClients } from '@/lib/actions/clients'
import { ClientsClient } from './_components/ClientsClient'

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientsClient initialClients={clients} />
}
