// Felles regler for hvordan innholdet sorteres og beskrives, brukt av både listene og Hjem.
import { useToast } from '../components/Toast'
import { updateRow } from './data'
import { formatDay } from './format'
import type { Issue, IssueStatus, Task } from './types'
import { useMe } from './useMe'

type NameOf = (id: string | null) => string

export const statusLabel: Record<IssueStatus, string> = { ny: 'Ny', pagar: 'Pågår', fikset: 'Fikset' }

/** Åpne gjøremål: de med frist først (tidligst øverst), så resten i rekkefølgen de kom inn. */
export function sortOpen(a: Task, b: Task) {
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
  if (a.due_date) return -1
  if (b.due_date) return 1
  return a.created_at.localeCompare(b.created_at)
}

export function taskMeta(t: Task, name: NameOf) {
  const parts: string[] = []
  if (t.responsible_user_id) parts.push(name(t.responsible_user_id))
  if (t.due_date) parts.push(`frist ${formatDay(t.due_date)}`)
  parts.push(`av ${name(t.created_by)}`)
  return parts.join(' · ')
}

/** Krysser av eller fjerner avkryssingen, og viser meg som «Gjort av» med en gang. */
export function useToggleTask() {
  const me = useMe()
  const toast = useToast()
  return (t: Task) =>
    updateRow<Task>('tasks', t.cabin_id, t.id, { done: !t.done }, { done_by: t.done ? null : me }).catch(() =>
      toast('Endringen ble ikke lagret. Sjekk at du har nett.'),
    )
}

/** Åpne feil: nyeste først. */
export const newestFirst = (a: Issue, b: Issue) => b.created_at.localeCompare(a.created_at)

export function issueMeta(i: Issue, name: NameOf) {
  return `Meldt av ${name(i.created_by)} · ${formatDay(i.created_at)}`
}

/** «Bare Ola kan slette …», eller «admin» hvis den som la det inn ikke er med lenger. */
export function onlyDeleter(creatorName: string) {
  return creatorName === 'Tidligere medlem' || !creatorName ? 'admin' : creatorName
}
