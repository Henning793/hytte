import { NavLink } from 'react-router'
import { House, ListChecks, Menu, ShoppingCart, Wrench, type LucideIcon } from 'lucide-react'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean; count?: number }

type Props = {
  /** Antall åpne feil, vises som tall-merke på Feil-fanen. */
  openIssues?: number
  /** Antall varer på handlelisten. */
  shoppingItems?: number
}

export function BottomNav({ openIssues = 0, shoppingItems = 0 }: Props) {
  const tabs: Tab[] = [
    { to: '/', label: 'Hjem', icon: House, end: true },
    { to: '/gjoremal', label: 'Gjøremål', icon: ListChecks },
    { to: '/feil', label: 'Feil', icon: Wrench, count: openIssues },
    { to: '/handleliste', label: 'Handleliste', icon: ShoppingCart, count: shoppingItems },
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
            <span className="dot" aria-label={`${count} ${label === 'Feil' ? 'åpne' : 'varer'}`}>
              {count}
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
