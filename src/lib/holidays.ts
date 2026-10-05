import { addDays } from './dates'

// Norske helligdager og merkedager, regnet ut for hvert år. De faste har samme
// dato hvert år; resten flytter seg med første påskedag. Derfor er kalenderen
// riktig år etter år, også uten nett. Skoleferier varierer mellom kommuner og
// legges inn som vanlige hendelser.

export type Holiday = { date: string; name: string; /** Offentlig fridag (rød dag). */ red: boolean }

/** Første påskedag (gregoriansk, «anonym» algoritme). */
export function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const cache = new Map<number, Holiday[]>()

export function holidaysIn(year: number): Holiday[] {
  let list = cache.get(year)
  if (!list) {
    const easter = easterSunday(year)
    const fixed = (md: string, name: string, red = true) => ({ date: `${year}-${md}`, name, red })
    const moving = (days: number, name: string, red = true) => ({ date: addDays(easter, days), name, red })
    list = [
      fixed('01-01', 'Første nyttårsdag'),
      moving(-7, 'Palmesøndag', false),
      moving(-3, 'Skjærtorsdag'),
      moving(-2, 'Langfredag'),
      moving(-1, 'Påskeaften', false),
      moving(0, 'Første påskedag'),
      moving(1, 'Andre påskedag'),
      fixed('05-01', 'Arbeidernes dag'),
      fixed('05-17', 'Grunnlovsdag'),
      moving(39, 'Kristi himmelfartsdag'),
      moving(48, 'Pinseaften', false),
      moving(49, 'Første pinsedag'),
      moving(50, 'Andre pinsedag'),
      fixed('06-23', 'Sankthansaften', false),
      fixed('12-24', 'Julaften', false),
      fixed('12-25', 'Første juledag'),
      fixed('12-26', 'Andre juledag'),
      fixed('12-31', 'Nyttårsaften', false),
    ].sort((x, y) => x.date.localeCompare(y.date))
    cache.set(year, list)
  }
  return list
}

/** Helligdagene mellom to datoer (begge med). */
export function holidaysBetween(from: string, to: string): Holiday[] {
  const out: Holiday[] = []
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) {
    for (const h of holidaysIn(y)) if (h.date >= from && h.date <= to) out.push(h)
  }
  return out
}
