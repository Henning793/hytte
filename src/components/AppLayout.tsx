import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'

/** Ramme for skjermene inne i en hytte: innhold øverst, bunnmeny nederst. */
export function AppLayout() {
  return (
    <>
      <main className="screen">
        <Outlet />
      </main>
      <BottomNav />
    </>
  )
}
