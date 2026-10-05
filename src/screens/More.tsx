import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  History,
  Info,
  ListTodo,
  LogOut,
  Moon,
  Palette,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/auth'
import { useCurrentCabin } from '../lib/cabins'
import { PALETTE, saveMyColor, useColors } from '../lib/members'
import { useMe } from '../lib/useMe'
import { setThemePreference, useTheme } from '../lib/theme'

const links: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/mer/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/mer/dokumenter', label: 'Dokumenter', icon: FileText },
  { to: '/mer/info', label: 'Info og koder', icon: Info },
  { to: '/mer/sjekkliste', label: 'Sjekklister', icon: ListTodo },
  { to: '/mer/medlemmer', label: 'Medlemmer', icon: Users },
  { to: '/mer/hytter', label: 'Mine hytter', icon: Warehouse },
]

const comingSoon: { label: string; icon: LucideIcon }[] = [
  { label: 'Historikk', icon: History },
  { label: 'Varsler', icon: Bell },
]

export function More() {
  const theme = useTheme()
  const { signOut } = useAuth()
  const cabin = useCurrentCabin()
  const meta: Record<string, string> = {
    '/mer/medlemmer': cabin.member_count === 1 ? '1 medlem' : `${cabin.member_count} medlemmer`,
  }
  const navigate = useNavigate()
  const dark = theme === 'dark'
  const me = useMe()
  const myColor = useColors(cabin.id)(me)
  const [choosingColor, setChoosingColor] = useState(false)

  return (
    <div className="scroll">
      <h1 className="t-title">Mer</h1>

      <div className="ha-list">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="ha-li">
            <Icon className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">{label}</span>
              {meta[to] && <span className="ha-li-meta">{meta[to]}</span>}
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
          <button type="button" className="ha-li" onClick={() => setChoosingColor(true)}>
            <Palette className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">Min farge</span>
              <span className="ha-li-meta">Viser deg i kalenderen</span>
            </span>
            <span className="cal-dot" style={{ background: myColor, width: 24, height: 24 }} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ha-li"
            onClick={async () => {
              await signOut()
              navigate('/velkommen', { replace: true })
            }}
          >
            <LogOut className="ha-ico" aria-hidden="true" />
            <span className="ha-li-main">
              <span className="ha-li-title">Logg ut</span>
            </span>
          </button>
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
      {choosingColor && <ColorSheet current={myColor} onClose={() => setChoosingColor(false)} />}
    </div>
  )
}

/** Velg egen farge i kalenderen. */
function ColorSheet({ current, onClose }: { current: string; onClose: () => void }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const toast = useToast()

  function choose(color: string) {
    onClose()
    if (color === current) return
    saveMyColor(cabin.id, me, color).then(
      () => toast('Fargen er lagret'),
      () => toast('Fargen ble ikke lagret. Prøv igjen.'),
    )
  }

  return (
    <Sheet label="Min farge" onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="t-heading">Min farge</h2>
        <p className="muted">Fargen viser når du er på hytta. Den gjelder i alle hyttene dine.</p>
      </div>
      <div className="swatches" role="radiogroup" aria-label="Farge">
        {PALETTE.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            className="swatch"
            aria-checked={p.value === current}
            aria-label={p.label}
            style={{ background: p.value }}
            onClick={() => choose(p.value)}
          >
            {p.value === current && <Check className="ha-ico" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose}>
        Avbryt
      </button>
    </Sheet>
  )
}
