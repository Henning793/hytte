import { useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useCurrentCabin } from '../../lib/cabins'
import { directionsFor, formatClock, legOf, osloDay, upcoming, useAtCabin, useFerry, useNow, type Direction } from '../../lib/ferry'
import { useCabinInfo } from '../../lib/info'
import { DirectionIcon } from './DirectionIcon'

const weekday = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', timeZone: 'Europe/Oslo' })

/**
 * «Neste ferge» på Hjem: den neste avgangen hver vei. Vises bare når hytta har valgt brygger.
 * Ferga mot hytta er grønn med hytte, ferga hjem er gul med hus. Er man på hytta i dag
 * (eget opphold i kalenderen), står ferga hjem først og størst.
 */
export function FerryCard() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const ferry = useCabinInfo(cabin.id).info?.ferry ?? null
  const { data, failed } = useFerry(cabin.id, ferry)
  const now = useNow()
  const order = directionsFor(useAtCabin(cabin.id))
  if (!ferry) return null

  const half = (dir: Direction, main: boolean) => {
    const leg = legOf(ferry, dir)
    const next = upcoming(dir === 'out' ? data?.out ?? [] : data?.home ?? [], now).find((d) => !d.cancelled)
    const day = next && osloDay(next.aimed) !== osloDay(now) ? (osloDay(next.aimed) === osloDay(now + 86_400_000) ? 'I morgen' : capitalize(weekday.format(new Date(next.aimed)))) : null
    return (
      <span key={dir} className={`ferry-half is-${dir}${main ? ' is-main' : ''}`}>
        <span className="ferry-dir">
          <DirectionIcon dir={dir} />
          Fra {leg.from.name}
        </span>
        <span className="ferry-next">{next ? formatClock(next.expected) : '–'}</span>
        <span className="ferry-sub">
          {next ? [day, next.booking ? 'Må bestilles' : null].filter(Boolean).join(' · ') || `Til ${leg.to.name}` : data ? 'Ingen avganger' : failed ? 'Ikke hentet' : 'Henter …'}
        </span>
      </span>
    )
  }

  return (
    <button type="button" className="ha-card card-link" onClick={() => navigate('/ferge')}>
      <span className="sec-h">
        <h2 className="t-heading">Neste ferge</h2>
        <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
      </span>
      <span className="ferry-halves">
        {half(order[0], true)}
        {half(order[1], false)}
      </span>
    </button>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
