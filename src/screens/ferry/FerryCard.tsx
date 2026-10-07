import { useNavigate } from 'react-router'
import { useCurrentCabin } from '../../lib/cabins'
import { formatClock, legOf, osloDay, upcoming, useFerry, useNow, type Departure, type Direction } from '../../lib/ferry'
import { useCabinInfo } from '../../lib/info'

/** «Neste ferge» på Hjem: de to neste avgangene hver vei. Vises bare når hytta har valgt brygger. */
export function FerryCard() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const ferry = useCabinInfo(cabin.id).info?.ferry ?? null
  const { data, failed } = useFerry(cabin.id, ferry)
  const now = useNow()
  if (!ferry) return null

  const line = (dir: Direction) => {
    const leg = legOf(ferry, dir)
    const next = upcoming(dir === 'out' ? data?.out ?? [] : data?.home ?? [], now).slice(0, 2)
    return (
      <span className="stack" style={{ gap: 2 }}>
        <span className="t-caption">
          {dir === 'out' ? 'Ut til hytta' : 'Hjem'} · {leg.from.name} → {leg.to.name}
        </span>
        <span className="t-body-lg">{data ? (next.length ? next.map((d) => label(d, now)).join(', ') : 'Ingen avganger lagret') : failed ? 'Fikk ikke hentet tidene' : 'Henter …'}</span>
      </span>
    )
  }

  return (
    <button type="button" className="ha-card card-link" onClick={() => navigate('/ferge')}>
      <span className="sec-h">
        <h2 className="t-heading">Neste ferge</h2>
      </span>
      {line('out')}
      {line('home')}
    </button>
  )
}

/** «14:10», «i morgen 05:15», «16:10 (må bestilles)», «17:20 innstilt». */
function label(d: Departure, now: number) {
  const day = osloDay(d.aimed) === osloDay(now) ? '' : osloDay(d.aimed) === osloDay(now + 86_400_000) ? 'i morgen ' : `${new Intl.DateTimeFormat('nb-NO', { weekday: 'short', timeZone: 'Europe/Oslo' }).format(new Date(d.aimed))} `
  const time = formatClock(d.cancelled ? d.aimed : d.expected)
  const extra = d.cancelled ? ' innstilt' : d.booking ? ' (må bestilles)' : ''
  return `${day}${time}${extra}`
}
