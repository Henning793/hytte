import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Phone, Ship, TriangleAlert } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useCurrentCabin } from '../../lib/cabins'
import { addDays, formatLongDay } from '../../lib/dates'
import { FERRY_DAYS, formatClock, legOf, osloDay, useFerry, useNow, type Departure, type Direction } from '../../lib/ferry'
import { useCabinInfo } from '../../lib/info'
import { Segmented } from '../../components/Segmented'
import { FerrySetup } from './FerrySetup'

const updated = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })

export function Ferry() {
  const cabin = useCurrentCabin()
  const { info, loaded } = useCabinInfo(cabin.id)
  const ferry = info?.ferry ?? null
  const { data, failed } = useFerry(cabin.id, ferry)
  const now = useNow()
  const today = osloDay(now)
  const [dir, setDir] = useState<Direction>('out')
  const [day, setDay] = useState(today)
  const [editing, setEditing] = useState(false)
  const [showPast, setShowPast] = useState(false)

  const list = data ? (dir === 'out' ? data.out : data.home).filter((d) => osloDay(d.aimed) === day) : []
  const leg = ferry ? legOf(ferry, dir) : null
  const lastDay = addDays(today, FERRY_DAYS - 1)
  const dayLabel = day === today ? 'I dag' : day === addDays(today, 1) ? 'I morgen' : capitalize(formatLongDay(day))
  const isPast = (d: Departure) => Date.parse(d.expected) < now - 60_000
  const nextId = list.find((d) => !d.cancelled && !isPast(d))?.aimed
  // I dag vises bare avgangene som ikke har gått, så neste ferge er øverst.
  const gone = list.filter(isPast).length
  const shown = showPast ? list : list.filter((d) => !isPast(d))

  return (
    <>
      <TopBar />
      <div className="scroll">
        <div className="sec-h">
          <h1 className="t-title">Ferge</h1>
          {ferry && (
            <button type="button" className="mini-btn row" style={{ gap: 6 }} onClick={() => setEditing(true)}>
              <Pencil className="ha-ico" aria-hidden="true" />
              Brygger
            </button>
          )}
        </div>

        {loaded && !ferry && (
          <div className="ha-card">
            <Ship className="ha-ico" aria-hidden="true" />
            <p className="t-body-lg">Tar dere ferge til hytta? Velg bryggene, så vises avgangene her og på Hjem.</p>
            <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={() => setEditing(true)}>
              Velg brygger
            </button>
          </div>
        )}

        {ferry && leg && (
          <>
            <Segmented
              label="Retning"
              value={dir}
              options={[
                { value: 'out', label: 'Ut til hytta' },
                { value: 'home', label: 'Hjem' },
              ]}
              onChange={setDir}
            />
            <p className="t-body-lg" style={{ margin: 0 }}>
              {leg.from.name} → {leg.to.name}
            </p>

            <div className="cal-head">
              <button type="button" className="mini-btn ico-only" aria-label="Dagen før" disabled={day <= today} onClick={() => setDay(addDays(day, -1))}>
                <ChevronLeft className="ha-ico" aria-hidden="true" />
              </button>
              <h2 className="t-heading cal-month" aria-live="polite">
                {dayLabel}
              </h2>
              <button type="button" className="mini-btn ico-only" aria-label="Dagen etter" disabled={day >= lastDay} onClick={() => setDay(addDays(day, 1))}>
                <ChevronRight className="ha-ico" aria-hidden="true" />
              </button>
            </div>

            {gone > 0 && (
              <button type="button" className="ha-btn ha-btn-ghost" onClick={() => setShowPast(!showPast)}>
                {showPast ? 'Skjul avganger som har gått' : gone === 1 ? 'Vis 1 avgang som har gått' : `Vis ${gone} avganger som har gått`}
              </button>
            )}
            {data && shown.length > 0 && (
              <div className="ha-card" style={{ padding: 0, gap: 0 }}>
                <ul className="ferry-list" aria-label={`Avganger ${dayLabel.toLowerCase()}`}>
                  {shown.map((d) => (
                    <DepartureRow key={d.aimed} d={d} past={isPast(d)} next={d.aimed === nextId} />
                  ))}
                </ul>
              </div>
            )}
            {data && list.length === 0 && <p className="empty">Ingen avganger denne dagen.</p>}
            {data && list.length > 0 && shown.length === 0 && <p className="empty">Ingen flere avganger i dag.</p>}
            {!data && !failed && <p className="muted">Henter avganger …</p>}
            {!data && failed && <p className="empty">Fikk ikke hentet avgangene. Prøv igjen når du har nett.</p>}

            {data && data.notices.length > 0 && (
              <section className="ha-card" aria-label="Driftsmeldinger">
                {data.notices.map((n) => (
                  <div key={n.id} className="row" style={{ alignItems: 'flex-start' }}>
                    <TriangleAlert className="ha-ico" aria-hidden="true" style={{ color: 'var(--on-accent-soft)', flex: 'none' }} />
                    <span className="stack" style={{ gap: 2 }}>
                      {n.summary && <strong>{n.summary}</strong>}
                      {n.description && n.description !== n.summary && <span className="t-caption">{n.description}</span>}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {data && (data.bookingPhone || data.bookingUrl) && (
              <section className="ha-card">
                <h2 className="t-heading">Bestilling</h2>
                <p className="muted" style={{ margin: 0 }}>Avganger merket «Må bestilles» går bare når noen har bestilt.</p>
                {data.bookingPhone && (
                  <a className="tel" style={{ justifyContent: 'flex-start' }} href={`tel:${data.bookingPhone.replace(/\s/g, '')}`}>
                    <Phone className="ha-ico" aria-hidden="true" style={{ marginRight: 8 }} />
                    {data.bookingPhone}
                  </a>
                )}
                {data.bookingUrl && <ExternalAnchor href={data.bookingUrl}>Bestill på nett</ExternalAnchor>}
              </section>
            )}

            {data && (
              <p className="t-caption">
                {failed ? 'Uten nett. Viser tidene som ble lagret ' : 'Tider og sanntid fra Entur, oppdatert '}
                {updated.format(new Date(data.fetchedAt))}.
                {data.operator?.url && (
                  <>
                    {' '}
                    <ExternalAnchor href={data.operator.url}>Rutetabell hos {data.operator.name}</ExternalAnchor>
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>
      {editing && <FerrySetup ferry={ferry} onClose={() => setEditing(false)} />}
    </>
  )
}

function DepartureRow({ d, past, next }: { d: Departure; past: boolean; next: boolean }) {
  const late = !d.cancelled && formatClock(d.expected) !== formatClock(d.aimed)
  return (
    <li className={`ferry-row${past ? ' is-past' : ''}${next ? ' is-next' : ''}`} aria-current={next ? 'true' : undefined}>
      <span className="ferry-time">
        <span className={d.cancelled || late ? 'ferry-struck' : undefined}>{formatClock(d.aimed)}</span>
        {late && <span> {formatClock(d.expected)}</span>}
        <span className="t-caption"> → {formatClock(d.cancelled ? d.aimedArrival : d.expectedArrival)}</span>
      </span>
      <span className="ferry-tags">
        {next && <span className="ha-badge ha-badge-fikset">Neste</span>}
        {d.cancelled && <span className="ha-badge ha-badge-ny">Innstilt</span>}
        {late && <span className="ha-badge ha-badge-pagar">Ny tid</span>}
        {d.booking && !d.cancelled && <span className="ha-badge ha-badge-neutral">Må bestilles</span>}
      </span>
    </li>
  )
}

function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  const url = /^https?:\/\//.test(href) ? href : `https://${href}`
  return (
    <a href={url} target="_blank" rel="noreferrer" className="row" style={{ display: 'inline-flex', gap: 4 }}>
      {children}
      <ExternalLink className="ha-ico" aria-hidden="true" style={{ width: 16, height: 16 }} />
    </a>
  )
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
