import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

// Et lite lager for innholdet i valgt hytte. Hver liste (f.eks. «tasks» for én
// hytte) hentes én gang, deles av alle skjermer, og endres lokalt med en gang
// før endringen sendes. Steg 7 bygger frakoblet-støtten (IndexedDB og utboks)
// på dette laget.

export type Snapshot<T> = { rows: T[] | null; failed: boolean }

type Entry = {
  snapshot: Snapshot<unknown>
  listeners: Set<() => void>
  fetcher: () => Promise<unknown[]>
  inflight: Promise<void> | null
}

const entries = new Map<string, Entry>()
const EMPTY: Snapshot<never> = { rows: null, failed: false }

function entry(key: string, fetcher: () => Promise<unknown[]>): Entry {
  let e = entries.get(key)
  if (!e) {
    e = { snapshot: EMPTY, listeners: new Set(), fetcher, inflight: null }
    entries.set(key, e)
  }
  return e
}

function publish(e: Entry, snapshot: Snapshot<unknown>) {
  e.snapshot = snapshot
  e.listeners.forEach((l) => l())
}

function load(key: string) {
  const e = entries.get(key)
  if (!e || e.inflight) return
  e.inflight = e
    .fetcher()
    .then(
      (rows) => publish(e, { rows, failed: false }),
      // Feiler hentingen (f.eks. uten nett), beholdes det vi har.
      () => publish(e, { rows: e.snapshot.rows, failed: true }),
    )
    .finally(() => {
      e.inflight = null
    })
}

/** Henter én liste på nytt. */
export function reload(key: string) {
  load(key)
}

/** Henter alle synlige lister på nytt, f.eks. når appen kommer i forgrunnen igjen. */
export function reloadAll() {
  for (const [key, e] of entries) if (e.listeners.size) load(key)
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reloadAll()
  })
  window.addEventListener('online', reloadAll)
}

export function useQuery<T>(key: string, fetcher: () => Promise<T[]>): Snapshot<T> {
  const e = entry(key, fetcher as () => Promise<unknown[]>)
  const snapshot = useSyncExternalStore(
    (listener) => {
      e.listeners.add(listener)
      return () => e.listeners.delete(listener)
    },
    () => e.snapshot,
  ) as Snapshot<T>

  useEffect(() => {
    load(key)
  }, [key])

  return snapshot
}

/** Endrer en liste lokalt (optimistisk). Gir en funksjon som angrer endringen. */
export function patchLocal<T>(key: string, change: (rows: T[]) => T[]): () => void {
  const e = entries.get(key)
  if (!e || !e.snapshot.rows) return () => {}
  const before = e.snapshot.rows as T[]
  publish(e, { ...e.snapshot, rows: change(before) })
  return () => publish(e, { ...e.snapshot, rows: before })
}

// ---------------------------------------------------------------------------
// Tabeller med innhold i en hytte
// ---------------------------------------------------------------------------

export type ContentTable = 'tasks' | 'issues' | 'shopping_items' | 'documents' | 'checklist_items'
type Row = { id: string; cabin_id: string; created_at: string }

export const tableKey = (table: ContentTable, cabinId: string) => `${table}:${cabinId}`

export function useTable<T extends Row>(table: ContentTable, cabinId: string): Snapshot<T> {
  return useQuery<T>(tableKey(table, cabinId), async () => {
    const { data, error } = await supabase.from(table).select('*').eq('cabin_id', cabinId).order('created_at')
    if (error) throw error
    return data as T[]
  })
}

/** Legger til en rad. Vises med en gang, og byttes med serverens versjon når den er lagret. */
export async function insertRow<T extends Row>(table: ContentTable, row: T): Promise<T> {
  const key = tableKey(table, row.cabin_id)
  const undo = patchLocal<T>(key, (rows) => [...rows, row])
  const { data, error } = await supabase.from(table).insert(row as never).select().single()
  if (error) {
    undo()
    throw error
  }
  patchLocal<T>(key, (rows) => rows.map((r) => (r.id === row.id ? (data as T) : r)))
  return data as T
}

/** Endrer en rad. `local` er det som vises før serveren svarer (f.eks. «Kjøpt av» meg). */
export async function updateRow<T extends Row>(
  table: ContentTable,
  cabinId: string,
  id: string,
  patch: Partial<T>,
  local: Partial<T> = {},
): Promise<void> {
  const key = tableKey(table, cabinId)
  const undo = patchLocal<T>(key, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, ...local } : r)))
  const { data, error } = await supabase.from(table).update(patch as never).eq('id', id).select().maybeSingle()
  if (error || !data) {
    undo()
    throw error ?? new Error('Ingen tilgang')
  }
  patchLocal<T>(key, (rows) => rows.map((r) => (r.id === id ? (data as T) : r)))
}

/** Sletter rader. Serveren sier hvilke som faktisk ble slettet (RLS). */
export async function deleteRows<T extends Row>(table: ContentTable, cabinId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const key = tableKey(table, cabinId)
  const undo = patchLocal<T>(key, (rows) => rows.filter((r) => !ids.includes(r.id)))
  const { data, error } = await supabase.from(table).delete().in('id', ids).select('id')
  if (error) {
    undo()
    throw error
  }
  if ((data ?? []).length < ids.length) {
    // Noe ble stående (ingen tilgang): hent listen på nytt.
    undo()
    load(key)
    throw new Error('Ingen tilgang')
  }
}
