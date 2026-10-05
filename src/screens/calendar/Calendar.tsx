import { Link, useNavigate, useSearchParams } from 'react-router'
import { CalendarPlus, ChevronLeft, ChevronRight, UserRoundCheck } from 'lucide-react'
import { PendingMark } from '../../components/OfflineBanner'
import { TopBar } from '../../components/TopBar'
import { useCurrentCabin } from '../../lib/cabins'
import { assignLanes, byStart, formatTime, useStayPerson, within } from '../../lib/calendar'
import { formatLongDay, formatMonth, formatRange, isoWeek, monthWeeks, toIso, todayIso } from '../../lib/dates'
import { usePendingIds, useTable } from '../../lib/data'
import { holidaysBetween, type Holiday } from '../../lib/holidays'
import type { CalendarEvent, Stay } from '../../lib/types'
import { useMe } from '../../lib/useMe'

const WEEKDAYS = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']
const WEEKDAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
/** Så mange personer får egen strek i en dagsrute; resten vises som «+2». */
const MAX_LANES = 3

export function Calendar() {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = todayIso()
  const selected = /^\d{4}-\d{2}-\d{2}$/.test(params.get('dag') ?? '') ? params.get('dag')! : today
  const year = Number(selected.slice(0, 4))
  const month = Number(selected.slice(5, 7)) - 1

  const stays = useTable<Stay>('stays', cabin.id).rows
  const events = useTable<CalendarEvent>('calendar_events', cabin.id).rows
  const { who, tint } = useStayPerson(cabin.id)
  const pending = usePendingIds()

  const weeks = monthWeeks(year, month)
  const gridFrom = weeks[0][0]
  const gridTo = weeks[weeks.length - 1][6]
  const monthFrom = `${selected.slice(0, 7)}-01`
  const monthTo = weeks.flat().filter((d) => d.startsWith(selected.slice(0, 7))).pop()!

  const gridStays = within(stays, gridFrom, gridTo).sort(byStart)
  const gridEvents = within(events, gridFrom, gridTo).sort(byStart)
  const holidays = new Map(holidaysBetween(gridFrom, gridTo).map((h) => [h.date, h]))
  const lanes = assignLanes(gridStays)

  const select = (day: string) => setParams({ dag: day }, { replace: true })
  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    // Samme dag i den nye måneden hvis den finnes, ellers den 1.
    const sameDay = new Date(d.getFullYear(), d.getMonth(), Number(selected.slice(8)))
    select(sameDay.getMonth() === d.getMonth() ? toIso(sameDay) : toIso(d))
  }

  const dayStays = within(stays, selected, selected).sort(byStart)
  const dayEvents = within(events, selected, selected).sort(byStart)
  const dayHoliday = holidays.get(selected)
  const myStay = dayStays.find((s) => s.user_id === me)

  const monthStays = within(stays, monthFrom, monthTo).sort(byStart)
  const monthEvents = within(events, monthFrom, monthTo).sort(byStart)
  const monthHolidays = holidaysBetween(monthFrom, monthTo)

  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <h1 className="t-title">Kalender</h1>

        <div className="stack">
          <div className="cal-head">
            <button type="button" className="mini-btn ico-only" aria-label="Forrige måned" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="ha-ico" aria-hidden="true" />
            </button>
            <h2 className="t-heading cal-month" aria-live="polite">
              {capitalize(formatMonth(year, month))}
            </h2>
            <button type="button" className="mini-btn ico-only" aria-label="Neste måned" onClick={() => shiftMonth(1)}>
              <ChevronRight className="ha-ico" aria-hidden="true" />
            </button>
          </div>

          <div className="cal" role="grid" aria-label={formatMonth(year, month)}>
            <div className="cal-row" role="row">
              <span className="cal-wk" role="columnheader">
                Uke
              </span>
              {WEEKDAYS.map((d, i) => (
                <span key={d} className="cal-dow" role="columnheader" aria-label={WEEKDAY_NAMES[i]}>
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0]} className="cal-row" role="row">
                <span className="cal-wk" role="rowheader" aria-label={`Uke ${isoWeek(week[0])}`}>
                  {isoWeek(week[0])}
                </span>
                {week.map((day, i) => {
                  const here = gridStays.filter((s) => s.start_date <= day && s.end_date >= day)
                  const evs = gridEvents.filter((e) => e.start_date <= day && e.end_date >= day)
                  const holiday = holidays.get(day)
                  const slots: (Stay | null)[] = Array.from({ length: MAX_LANES }, () => null)
                  let extra = 0
                  for (const s of here) {
                    const lane = lanes.get(s.id) ?? 0
                    if (lane < MAX_LANES) slots[lane] = s
                    else extra++
                  }
                  const classes = ['cal-day']
                  if (!day.startsWith(selected.slice(0, 7))) classes.push('is-other')
                  if (i === 6 || holiday?.red) classes.push('is-red')
                  if (day === today) classes.push('is-today')
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      className={classes.join(' ')}
                      aria-selected={day === selected}
                      aria-label={dayLabel(day, here.length, evs.length, holiday)}
                      onClick={() => select(day)}
                    >
                      <span className="cal-num">{Number(day.slice(8))}</span>
                      <span className="cal-bars" aria-hidden="true">
                        {slots.map((s, lane) =>
                          s ? (
                            <span
                              key={lane}
                              className={[
                                'cal-bar',
                                s.start_date === day || i === 0 ? 'starts' : '',
                                s.end_date === day || i === 6 ? 'ends' : '',
                              ].join(' ')}
                              style={{ background: tint(s) }}
                            />
                          ) : (
                            <span key={lane} className="cal-bar" />
                          ),
                        )}
                      </span>
                      <span className="cal-marks" aria-hidden="true">
                        {evs.length > 0 && <span className="cal-event" />}
                        {extra > 0 && <span className="cal-extra">+{extra}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <section className="stack" aria-labelledby="day-h">
          <div className="stack" style={{ gap: 2 }}>
            <h2 className="t-heading" id="day-h">
              {capitalize(selected === today ? `i dag, ${formatLongDay(selected)}` : formatLongDay(selected))}
            </h2>
            {dayHoliday && <p className={dayHoliday.red ? 'cal-holiday red' : 'cal-holiday'}>{dayHoliday.name}</p>}
          </div>
          {dayStays.length > 0 || dayEvents.length > 0 ? (
            <div className="ha-list">
              {dayStays.map((s) => (
                <StayRow key={s.id} stay={s} name={who(s)} color={tint(s)} pending={pending.has(s.id)} />
              ))}
              {dayEvents.map((e) => (
                <EventRow key={e.id} event={e} pending={pending.has(e.id)} />
              ))}
            </div>
          ) : (
            <p className="muted">{selected < today ? 'Ingen var på hytta denne dagen.' : 'Ingen har sagt at de er på hytta denne dagen.'}</p>
          )}
          <div className="tiles">
            <button
              type="button"
              className="ha-tile ha-tile-primary cal-tile"
              onClick={() => navigate(myStay ? `/mer/kalender/opphold/${myStay.id}` : `/mer/kalender/opphold/ny?dato=${selected}`)}
            >
              <UserRoundCheck className="ha-ico" aria-hidden="true" />
              {myStay ? 'Endre oppholdet mitt' : 'Jeg er på hytta'}
            </button>
            <button type="button" className="ha-tile ha-tile-secondary cal-tile" onClick={() => navigate(`/mer/kalender/hendelse/ny?dato=${selected}`)}>
              <CalendarPlus className="ha-ico" aria-hidden="true" />
              Ny hendelse
            </button>
          </div>
        </section>

        <section className="stack" aria-labelledby="month-h">
          <h2 className="list-h" id="month-h">
            I {formatMonth(year, month).split(' ')[0]}
          </h2>
          {monthStays.length + monthEvents.length + monthHolidays.length === 0 ? (
            <p className="muted">Ingenting lagt inn denne måneden.</p>
          ) : (
            <div className="ha-list">
              {mergeByDate(monthStays, monthEvents, monthHolidays).map((item) =>
                item.type === 'stay' ? (
                  <StayRow key={item.row.id} stay={item.row} name={who(item.row)} color={tint(item.row)} pending={pending.has(item.row.id)} />
                ) : item.type === 'event' ? (
                  <EventRow key={item.row.id} event={item.row} pending={pending.has(item.row.id)} />
                ) : (
                  <button key={item.row.date} type="button" className="ha-li" onClick={() => select(item.row.date)}>
                    <span className={item.row.red ? 'cal-dot holiday red' : 'cal-dot holiday'} aria-hidden="true" />
                    <span className="ha-li-main">
                      <span className="ha-li-title">{item.row.name}</span>
                      <span className="ha-li-meta">
                        {capitalize(formatLongDay(item.row.date))}
                        {item.row.red ? ' · fridag' : ''}
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function StayRow({ stay, name, color, pending }: { stay: Stay; name: string; color: string; pending: boolean }) {
  return (
    <Link className="ha-li" to={`/mer/kalender/opphold/${stay.id}`}>
      <span className="cal-dot" style={{ background: color }} aria-hidden="true" />
      <span className="ha-li-main">
        <span className="ha-li-title">{name} er på hytta</span>
        <span className="ha-li-meta">
          <PendingMark show={pending} />
          {formatRange(stay.start_date, stay.end_date)}
          {stay.note ? ` · ${stay.note}` : ''}
        </span>
      </span>
      <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
    </Link>
  )
}

function EventRow({ event, pending }: { event: CalendarEvent; pending: boolean }) {
  const time = formatTime(event)
  return (
    <Link className="ha-li" to={`/mer/kalender/hendelse/${event.id}`}>
      <span className="cal-dot event" aria-hidden="true" />
      <span className="ha-li-main">
        <span className="ha-li-title">{event.title}</span>
        <span className="ha-li-meta">
          <PendingMark show={pending} />
          {formatRange(event.start_date, event.end_date)}
          {time ? ` · ${time}` : ''}
        </span>
      </span>
      <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
    </Link>
  )
}

type Item = { type: 'stay'; date: string; row: Stay } | { type: 'event'; date: string; row: CalendarEvent } | { type: 'holiday'; date: string; row: Holiday }

function mergeByDate(stays: Stay[], events: CalendarEvent[], holidays: Holiday[]): Item[] {
  const items: Item[] = [
    ...holidays.map((h) => ({ type: 'holiday' as const, date: h.date, row: h })),
    ...events.map((e) => ({ type: 'event' as const, date: e.start_date, row: e })),
    ...stays.map((s) => ({ type: 'stay' as const, date: s.start_date, row: s })),
  ]
  // Stabil sortering: på samme dag kommer helligdag, så hendelser, så opphold.
  return items.sort((a, b) => a.date.localeCompare(b.date))
}

function dayLabel(day: string, people: number, events: number, holiday?: Holiday) {
  const parts = [formatLongDay(day)]
  if (holiday) parts.push(holiday.name)
  if (people) parts.push(people === 1 ? '1 på hytta' : `${people} på hytta`)
  if (events) parts.push(events === 1 ? '1 hendelse' : `${events} hendelser`)
  return parts.join(', ')
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
