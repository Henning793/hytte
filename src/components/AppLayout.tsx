import { useEffect } from 'react'
import { Outlet, useSearchParams } from 'react-router'
import { useCabins, useCurrentCabin } from '../lib/cabins'
import { useTable } from '../lib/data'
import type { ShoppingItem, Task } from '../lib/types'
import { BottomNav } from './BottomNav'
import { OfflineBanner } from './OfflineBanner'

/** Ramme for skjermene inne i en hytte: innhold øverst, bunnmeny nederst. */
export function AppLayout() {
  const cabin = useCurrentCabin()
  const { cabins, select } = useCabins()
  const [params, setParams] = useSearchParams()

  // Åpnet fra et varsel (?hytte=<id>): vis hytta varselet gjelder.
  const fromNotification = params.get('hytte')
  useEffect(() => {
    if (!fromNotification) return
    if (cabins.some((c) => c.id === fromNotification)) select(fromNotification)
    setParams(
      (p) => {
        p.delete('hytte')
        return p
      },
      { replace: true },
    )
  }, [fromNotification, cabins, select, setParams])

  const tasks = useTable<Task>('tasks', cabin.id).rows
  const items = useTable<ShoppingItem>('shopping_items', cabin.id).rows
  return (
    <>
      <main className="screen">
        <OfflineBanner />
        <Outlet />
      </main>
      <BottomNav
        openFaults={tasks?.filter((t) => t.kind === 'feil' && !t.done).length}
        shoppingItems={items?.filter((i) => !i.done).length}
      />
    </>
  )
}
