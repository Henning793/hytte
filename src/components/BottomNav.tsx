import { NavLink } from 'react-router'
import { CalendarDays, House, ListChecks, Menu, ShoppingCart, type LucideIcon } from 'lucide-react'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean; count?: number }

type Props = {
  /** Antall åpne feil, vises som tall-merke på Oppgaver-fanen. */
  openFaults?: number
  /** Antall varer på handlelisten. */
  shoppingItems?: number
}

export function BottomNav({ openFaults = 0, shoppingItems = 0 }: Props) {
  const tabs: Tab[] = [
    { to: '/', label: 'Hjem', icon: House, end: true },
    { to: '/oppgaver', label: 'Oppgaver', icon: ListChecks, count: openFaults },
    { to: '/handleliste', label: 'Handleliste', icon: ShoppingCart, count: shoppingItems },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays },
    { to: '/mer', label: 'Mer', icon: Menu },
  ]

  return (
    <nav className="ha-nav" aria-label="Hovedmeny">
      {tabs.map(({ to, label, icon: Icon, end, count }) => (
        <NavLink key={to} to={to} end={end}>
          <span className="pill">
            <Icon className="ha-ico" aria-hidden="true" />
          </span>
          {label}
          {count ? (
            <span className={to === '/oppgaver' ? 'dot' : 'dot dot-neutral'} aria-label={to === '/oppgaver' ? `${count} åpne feil` : `${count} varer`}>
              {count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
