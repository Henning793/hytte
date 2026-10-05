// Historikken samler det medlemmene skriver inn selv med fullførte gjøremål og fiksede feil.
import { toIso } from './dates'
import type { HistoryEntry, Issue, Task } from './types'

export type HistoryItem =
  | { type: 'entry'; id: string; date: string; title: string; text: string | null; by: string | null; row: HistoryEntry }
  | { type: 'task'; id: string; date: string; title: string; text: string | null; by: string | null; row: Task }
  | { type: 'issue'; id: string; date: string; title: string; text: string | null; by: string | null; row: Issue }

/** Lokal dato for et tidspunkt («2026-10-05T21:30Z» → «2026-10-05» i norsk tid). */
const dayOf = (timestamp: string) => toIso(new Date(timestamp))

export function historyItems(entries: HistoryEntry[] | null, tasks: Task[] | null, issues: Issue[] | null): HistoryItem[] {
  const items: HistoryItem[] = [
    ...(entries ?? []).map((e) => ({ type: 'entry' as const, id: e.id, date: e.happened_on, title: e.title, text: e.description, by: e.created_by, row: e })),
    ...(tasks ?? [])
      .filter((t) => t.done)
      .map((t) => ({ type: 'task' as const, id: t.id, date: dayOf(t.done_at ?? t.updated_at), title: t.title, text: t.description, by: t.done_by, row: t })),
    // Feil har ikke eget «fikset»-tidspunkt; siste endring er når statusen ble satt.
    ...(issues ?? [])
      .filter((i) => i.status === 'fikset')
      .map((i) => ({ type: 'issue' as const, id: i.id, date: dayOf(i.updated_at), title: i.title, text: i.description, by: null, row: i })),
  ]
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.row.created_at.localeCompare(a.row.created_at))
}

/** Søk i tittel og tekst, uten å bry seg om store og små bokstaver. */
export function matches(item: HistoryItem, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('nb')
  if (!q) return true
  return `${item.title} ${item.text ?? ''}`.toLocaleLowerCase('nb').includes(q)
}
