// Datoer som ren tekst («2026-10-10») i lokal tid. Kalenderen regner bare med hele dager.

const pad = (n: number) => String(n).padStart(2, '0')

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayIso = () => toIso(new Date())

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}

/** Ukenummer etter ISO 8601, slik norske kalendere viser det. */
export function isoWeek(iso: string): number {
  const d = fromIso(iso)
  // Torsdagen i samme uke avgjør hvilket år uka hører til.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round((d.getTime() - jan4.getTime()) / 86_400_000 / 7 - (3 - ((jan4.getDay() + 6) % 7)) / 7)
}

/** Ukene som vises for en måned: fra mandagen før den 1. til søndagen etter den siste. */
export function monthWeeks(year: number, month: number): string[][] {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7))
  const last = new Date(year, month + 1, 0)
  const weeks: string[][] = []
  const d = new Date(start)
  while (d <= last || weeks.length === 0 || weeks[weeks.length - 1].length < 7) {
    if (!weeks.length || weeks[weeks.length - 1].length === 7) weeks.push([])
    weeks[weeks.length - 1].push(toIso(d))
    d.setDate(d.getDate() + 1)
  }
  return weeks
}

/** Overlapper perioden [start, end] med [from, to]? */
export const overlaps = (start: string, end: string, from: string, to: string) => start <= to && end >= from

const monthYear = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' })
const longDay = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
const dayMonth = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })

/** «oktober 2026» */
export const formatMonth = (year: number, month: number) => monthYear.format(new Date(year, month, 1))

/** «lørdag 10. oktober» */
export const formatLongDay = (iso: string) => longDay.format(fromIso(iso))

/** «10.–14. okt.», «30. sep.–2. okt.», med år når perioden ikke er i år. */
export function formatRange(start: string, end: string): string {
  const a = fromIso(start)
  const b = fromIso(end)
  const thisYear = new Date().getFullYear()
  const withYear = a.getFullYear() !== thisYear || b.getFullYear() !== thisYear
  const fmt = withYear ? dayMonthYear : dayMonth
  if (start === end) return fmt.format(a)
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()}.–${fmt.format(b)}`
  if (a.getFullYear() === b.getFullYear() && withYear) return `${dayMonth.format(a)}–${fmt.format(b)}`
  return `${fmt.format(a)}–${fmt.format(b)}`
}
