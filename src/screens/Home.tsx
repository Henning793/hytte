import { useNavigate } from 'react-router'
import { DoorOpen, Wrench } from 'lucide-react'
import { CabinSwitcher } from '../components/CabinSwitcher'
import { StatusBadge } from '../components/StatusBadge'
import { useCurrentCabin } from '../lib/cabins'
import { byStart, formatTime, useStayPerson } from '../lib/calendar'
import { newestFirst, sortOpen, taskMeta } from '../lib/content'
import { formatRange, todayIso } from '../lib/dates'
import { useTable } from '../lib/data'
import { count } from '../lib/format'
import { useNames } from '../lib/members'
import type { CalendarEvent, Issue, ShoppingItem, Stay, Task } from '../lib/types'

export function Home() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const name = useNames(cabin.id)
  const issues = useTable<Issue>('issues', cabin.id).rows
  const tasks = useTable<Task>('tasks', cabin.id).rows
  const items = useTable<ShoppingItem>('shopping_items', cabin.id).rows
  const stays = useTable<Stay>('stays', cabin.id).rows
  const events = useTable<CalendarEvent>('calendar_events', cabin.id).rows
  const { who, tint } = useStayPerson(cabin.id)

  const openIssues = (issues ?? []).filter((i) => i.status !== 'fikset').sort(newestFirst)
  const openTasks = (tasks ?? []).filter((t) => !t.done).sort(sortOpen)
  const next = openTasks[0]
  const today = todayIso()
  const hereNow = (stays ?? []).filter((s) => s.start_date <= today && s.end_date >= today).sort(byStart)
  const nextStay = (stays ?? []).filter((s) => s.start_date > today).sort(byStart)[0]
  const nextEvent = (events ?? []).filter((e) => e.end_date >= today).sort(byStart)[0]
  const toBuy = (items ?? []).filter((i) => !i.done).sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <>
      <CabinSwitcher />
      <div className="scroll" style={{ paddingTop: 12 }}>
        <div className="tiles">
          <button type="button" className="ha-tile ha-tile-primary" onClick={() => navigate('/feil/ny')}>
            <Wrench className="ha-ico" aria-hidden="true" />
            Noe som må fikses?
          </button>
          <button type="button" className="ha-tile ha-tile-secondary" onClick={() => navigate('/mer/sjekkliste')}>
            <DoorOpen className="ha-ico" aria-hidden="true" />
            Ankomst / Avreise
          </button>
        </div>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/handleliste')}>
          <span className="sec-h">
            <h2 className="t-heading">Handleliste</h2>
            {items && toBuy.length > 0 && <span className="t-caption">{count(toBuy.length, 'vare', 'varer')}</span>}
          </span>
          {items && (
            <span className="muted">{toBuy.length ? toBuy.map((i) => i.name).join(', ') : 'Ingenting på lista.'}</span>
          )}
        </button>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/gjoremal')}>
          <span className="sec-h">
            <h2 className="t-heading">Neste gjøremål</h2>
            {tasks && openTasks.length > 0 && <span className="t-caption">{openTasks.length} igjen</span>}
          </span>
          {next && (
            <span className="stack" style={{ gap: 2 }}>
              <span className="t-body-lg">{next.title}</span>
              <span className="t-caption">{taskMeta(next, name)}</span>
            </span>
          )}
          {tasks && !next && <span className="muted">Ingen gjøremål. Legg til det første under Gjøremål.</span>}
        </button>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/feil')}>
          <span className="sec-h">
            <h2 className="t-heading">Feil og mangler</h2>
            {issues && openIssues.length > 0 && <span className="t-caption">{count(openIssues.length, 'åpen', 'åpne')}</span>}
          </span>
          {openIssues.slice(0, 2).map((i) => (
            <span key={i.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-lg grow">{i.title}</span>
              <StatusBadge status={i.status} />
            </span>
          ))}
          {issues && openIssues.length === 0 && <span className="muted">Ingen åpne feil. Fint!</span>}
        </button>

        {hereNow.length > 0 && (
          <button type="button" className="ha-card card-link" onClick={() => navigate('/mer/kalender')}>
            <span className="sec-h">
              <h2 className="t-heading">På hytta</h2>
            </span>
            <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {hereNow.map((s) => (
                <span key={s.id} className="cal-dot" style={{ background: tint(s) }} aria-hidden="true" />
              ))}
              <span className="t-body-lg">{names(hereNow.map(who))} er der nå</span>
            </span>
            {nextStay && (
              <span className="t-caption">
                Neste: {who(nextStay)} · {formatRange(nextStay.start_date, nextStay.end_date)}
              </span>
            )}
            {nextEvent && (
              <span className="t-caption">
                {nextEvent.title} · {formatRange(nextEvent.start_date, nextEvent.end_date)}
                {formatTime(nextEvent) ? ` ${formatTime(nextEvent)}` : ''}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  )
}

/** «Kari», «Kari og Ola», «Kari, Ola og Per». */
function names(list: string[]) {
  const unique = [...new Set(list)]
  return unique.length < 2 ? unique.join('') : `${unique.slice(0, -1).join(', ')} og ${unique[unique.length - 1]}`
}
