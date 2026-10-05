import { Link } from 'react-router'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  History,
  Info,
  ListTodo,
  LogOut,
  Moon,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { setThemePreference, useTheme } from '../lib/theme'

const links: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/mer/dokumenter', label: 'Dokumenter', icon: FileText },
  { to: '/mer/info', label: 'Info og koder', icon: Info },
  { to: '/mer/sjekkliste', label: 'Sjekklister', icon: ListTodo },
  { to: '/mer/medlemmer', label: 'Medlemmer', icon: Users },
  { to: '/mer/hytter', label: 'Mine hytter', icon: Warehouse },
]

const comingSoon: { label: string; icon: LucideIcon }[] = [
  { label: 'Kalender', icon: CalendarDays },
  { label: 'Historikk', icon: History },
  { label: 'Varsler', icon: Bell },
]

export function More() {
  const theme = useTheme()
  const dark = theme === 'dark'

  return (
    <div className="scroll">
      <h1 className="t-title">Mer</h1>

      <div className="ha-list">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="ha-li">
            <Icon className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">{label}</span>
            </span>
            <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="stack">
        <h2 className="list-h">Innstillinger</h2>
        <div className="ha-list">
          <div className="ha-li">
            <Moon className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title" id="dark-label">
                Mørkt tema
              </span>
            </span>
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={dark}
              aria-labelledby="dark-label"
              onClick={() => setThemePreference(dark ? 'light' : 'dark')}
            />
          </div>
          {/* Logg ut kobles til Supabase Auth i steg 3. */}
          <Link to="/velkommen" className="ha-li">
            <LogOut className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">Logg ut</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="ha-list">
        {comingSoon.map(({ label, icon: Icon }) => (
          <div key={label} className="ha-li soon">
            <Icon className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">{label}</span>
            </span>
            <span className="ha-badge ha-badge-neutral">Kommer</span>
          </div>
        ))}
      </div>
    </div>
  )
}
