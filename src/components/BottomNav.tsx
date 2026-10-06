import { NavLink } from 'react-router'
import { CalendarDays, House, ListChecks, Menu, ShoppingCart, type LucideIcon } from 'lucide-react'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean; count?: number; urgent?: boolean; countLabel?: string }

type Props = {
  /** Antall åpne oppgaver (feil og vanlige), vises som tall-merke på Oppgaver-fanen. */
  openTasks?: number
  /** Antall åpne feil. Merket er rødt så lenge det finnes minst én. */
  openFaults?: number
  /** Antall varer på handlelisten. */
  shoppingItems?: number
}

export function BottomNav({ openTasks = 0, openFaults = 0, shoppingItems = 0 }: Props) {
  const tasksLabel =
    openFaults > 0
      ? `${openTasks} åpne oppgaver, ${openFaults} av dem feil`
      : `${openTasks} åpne oppgaver`
  const tabs: Tab[] = [
    { to: '/', label: 'Hjem', icon: House, end: true },
    { to: '/oppgaver', label: 'Oppgaver', icon: ListChecks, count: openTasks, urgent: openFaults > 0, countLabel: tasksLabel },
    { to: '/handleliste', label: 'Handleliste', icon: ShoppingCart, count: shoppingItems, countLabel: `${shoppingItems} varer` },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays },
    { to: '/mer', label: 'Mer', icon: Menu },
  ]

  return (
    <nav className="ha-nav" aria-label="Hovedmeny">
      {tabs.map(({ to, label, icon: Icon, end, count, urgent, countLabel }) => (
        <NavLink key={to} to={to} end={end}>
          <span className="pill">
            <Icon className="ha-ico" aria-hidden="true" />
          </span>
          {label}
          {count ? (
            <span className={urgent ? 'dot' : 'dot dot-neutral'} aria-label={countLabel}>
              {count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
