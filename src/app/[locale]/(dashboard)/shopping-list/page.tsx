import { getShoppingLists } from '@/lib/actions/shopping-lists'
import { ShoppingListsClient } from './_components/ShoppingListsClient'

export default async function ShoppingListPage() {
  const lists = await getShoppingLists()
  return <ShoppingListsClient lists={lists} />
}
