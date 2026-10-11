import { useEffect } from 'react'
import { Outlet, useSearchParams } from 'react-router'
import { useAuth } from '../lib/auth'
import { useCabins, useCurrentCabin } from '../lib/cabins'
import { useTable } from '../lib/data'
import type { ShoppingItem, Task } from '../lib/types'
import { useIntro } from '../lib/intro'
import { BottomNav } from './BottomNav'
import { Intro } from './Intro'
import { OfflineBanner } from './OfflineBanner'
import { UpdateBanner } from './UpdateBanner'

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
  const [intro, closeIntro] = useIntro(useAuth().session?.user)
  return (
    <>
      <main className="screen">
        <UpdateBanner />
        <OfflineBanner />
        <Outlet />
      </main>
      <BottomNav
        openTasks={tasks?.filter((t) => !t.done).length}
        openFaults={tasks?.filter((t) => t.kind === 'feil' && !t.done).length}
        shoppingItems={items?.filter((i) => !i.done).length}
      />
      {intro && <Intro onClose={closeIntro} />}
    </>
  )
}
