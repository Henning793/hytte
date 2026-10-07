import { useNavigate } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useCurrentCabin } from '../../lib/cabins'
import { formatClock, legOf, osloDay, upcoming, useFerry, useNow, type Direction } from '../../lib/ferry'
import { useCabinInfo } from '../../lib/info'

const weekday = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', timeZone: 'Europe/Oslo' })

/** «Neste ferge» på Hjem: den neste avgangen hver vei. Vises bare når hytta har valgt brygger. */
export function FerryCard() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const ferry = useCabinInfo(cabin.id).info?.ferry ?? null
  const { data, failed } = useFerry(cabin.id, ferry)
  const now = useNow()
  if (!ferry) return null

  const half = (dir: Direction) => {
    const next = upcoming(dir === 'out' ? data?.out ?? [] : data?.home ?? [], now).find((d) => !d.cancelled)
    const day = next && osloDay(next.aimed) !== osloDay(now) ? (osloDay(next.aimed) === osloDay(now + 86_400_000) ? 'I morgen' : capitalize(weekday.format(new Date(next.aimed)))) : null
    return (
      <span className="ferry-half">
        <span className="ferry-dir">{dir === 'out' ? 'Ut til hytta' : 'Hjem'}</span>
        <span className="ferry-next">{next ? formatClock(next.expected) : '–'}</span>
        <span className="t-caption">
          {next ? [day, next.booking ? 'Må bestilles' : null].filter(Boolean).join(' · ') || `Fra ${legOf(ferry, dir).from.name}` : data ? 'Ingen avganger' : failed ? 'Ikke hentet' : 'Henter …'}
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
        {half('out')}
        {half('home')}
      </span>
    </button>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
