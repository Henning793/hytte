import { Outlet } from 'react-router'
import { useCurrentCabin } from '../lib/cabins'
import { useTable } from '../lib/data'
import type { Issue, ShoppingItem } from '../lib/types'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'

/** Ramme for skjermene inne i en hytte: innhold øverst, bunnmeny nederst. */
export function AppLayout() {
  const cabin = useCurrentCabin()
  const issues = useTable<Issue>('issues', cabin.id).rows
  const items = useTable<ShoppingItem>('shopping_items', cabin.id).rows
  return (
    <>
      <main className="screen">
        <OfflineBanner />
        <Outlet />
      </main>
      <BottomNav
        openIssues={issues?.filter((i) => i.status !== 'fikset').length}
        shoppingItems={items?.filter((i) => !i.done).length}
      />
    </>
  )
}
