import { useEffect, useSyncExternalStore } from 'react'
import { idbClear, idbDelWhere, idbGet, idbSet } from './idb'
import { supabase } from './supabase'

// Et lite lager for innholdet i valgt hytte.
//
// - Hver liste (f.eks. «tasks» for én hytte) hentes én gang og deles av alle skjermer.
// - Siste kjente versjon lagres i IndexedDB og vises med en gang, også uten nett.
// - Alle endringer vises lokalt med en gang og legges i en utboks. Utboksen sendes
//   i rekkefølge, og venter når det ikke er nett. Den lagres også, så endringer
//   overlever at appen lukkes.

export type Snapshot<T> = { rows: T[] | null; failed: boolean }

type Entry = {
  snapshot: Snapshot<unknown>
  listeners: Set<() => void>
  fetcher: () => Promise<unknown[]>
  inflight: Promise<void> | null
}

const entries = new Map<string, Entry>()
const EMPTY: Snapshot<never> = { rows: null, failed: false }
const cacheKey = (key: string) => `q:${key}`

function entry(key: string, fetcher: () => Promise<unknown[]>): Entry {
  let e = entries.get(key)
  if (!e) {
    e = { snapshot: EMPTY, listeners: new Set(), fetcher, inflight: null }
    entries.set(key, e)
    hydrate(key, e)
  }
  return e
}

/** Viser siste lagrede versjon til den ferske er hentet. */
function hydrate(key: string, e: Entry) {
  void idbGet<unknown[]>(cacheKey(key)).then((rows) => {
    if (rows && e.snapshot.rows === null) publish(key, e, { rows: withPending(key, rows), failed: false })
  })
}

function publish(key: string, e: Entry, snapshot: Snapshot<unknown>) {
  e.snapshot = snapshot
  e.listeners.forEach((l) => l())
  if (snapshot.rows) void idbSet(cacheKey(key), snapshot.rows)
}

function load(key: string) {
  const e = entries.get(key)
  if (!e || e.inflight) return
  e.inflight = e
    .fetcher()
    .then(
      (rows) => {
        markOnline()
        // Endringer som ikke er sendt ennå, legges oppå det serveren har.
        publish(key, e, { rows: withPending(key, rows), failed: false })
      },
      (error) => {
        if (isNetworkError(error)) markOffline()
        // Feiler hentingen, beholdes det vi har.
        publish(key, e, { rows: e.snapshot.rows, failed: true })
      },
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

/** Endrer en liste lokalt. */
function patchLocal<T>(key: string, change: (rows: T[]) => T[]) {
  const e = entries.get(key)
  if (!e || !e.snapshot.rows) return
  publish(key, e, { ...e.snapshot, rows: change(e.snapshot.rows as T[]) })
}

// ---------------------------------------------------------------------------
// Nett eller ikke
// ---------------------------------------------------------------------------

/** Feil som betyr «fikk ikke kontakt», ikke «serveren sa nei». */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i.test(message)
}

type SyncState = { offline: boolean; pending: number; synced: boolean }
let sync: SyncState = { offline: typeof navigator !== 'undefined' && !navigator.onLine, pending: 0, synced: false }
const syncListeners = new Set<() => void>()
let syncedTimer: ReturnType<typeof setTimeout> | undefined

function setSync(change: Partial<SyncState>) {
  const next = { ...sync, ...change }
  if (next.offline === sync.offline && next.pending === sync.pending && next.synced === sync.synced) return
  sync = next
  syncListeners.forEach((l) => l())
}

function markOffline() {
  setSync({ offline: true, synced: false })
}

function markOnline() {
  if (sync.offline) setSync({ offline: false })
}

/** Frakoblet, antall endringer som venter, og «Alt er sendt» i 3 sekunder etterpå. */
export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (l) => {
      syncListeners.add(l)
      return () => syncListeners.delete(l)
    },
    () => sync,
  )
}

// ---------------------------------------------------------------------------
// Utboksen
// ---------------------------------------------------------------------------

export type ContentTable = 'tasks' | 'issues' | 'shopping_items' | 'documents' | 'checklist_items' | 'stays' | 'calendar_events' | 'history_entries'
type Row = { id: string; cabin_id: string; created_at: string }
type Upload = { file: Blob; cabinId: string; folder: string; field: string; ext: string; type: string }

type Op = { id: string; key: string } & (
  | { kind: 'insert'; table: string; row: Row; upload?: Upload }
  | { kind: 'update'; table: string; rowId: string; patch: object; local: object }
  | { kind: 'delete'; table: string; ids: string[] }
  | { kind: 'upsert'; table: string; conflict: string; match: Record<string, string>; fields: object }
  | { kind: 'insertMinimal'; table: string; row: Record<string, unknown> & { id: string } }
)

const OUTBOX = 'outbox'
let outbox: Op[] = []
let outboxLoaded: Promise<void> | null = null
const waiting = new Map<string, { resolve: () => void; reject: (e: unknown) => void }>()
const pendingListeners = new Set<() => void>()
let pendingIds: ReadonlySet<string> = new Set()
type SyncErrorListener = (message: string) => void
const errorListeners = new Set<SyncErrorListener>()

function loadOutbox() {
  if (!outboxLoaded) {
    outboxLoaded = idbGet<Op[]>(OUTBOX).then((saved) => {
      // Endringer som er lagt til før lagringen var lest, kommer etter de lagrede.
      outbox = [...(saved ?? []), ...outbox.filter((op) => !saved?.some((s) => s.id === op.id))]
      outboxChanged()
      // Lister som ble vist før utboksen var lest, får endringene som venter.
      for (const op of saved ?? []) patchLocal(op.key, (rows) => applyOp(op, rows))
    })
  }
  return outboxLoaded
}

function outboxChanged() {
  void idbSet(OUTBOX, outbox)
  pendingIds = new Set(outbox.flatMap(rowIdsOf))
  pendingListeners.forEach((l) => l())
  setSync({ pending: outbox.length })
}

function rowIdsOf(op: Op): string[] {
  if (op.kind === 'insert' || op.kind === 'insertMinimal') return [op.row.id]
  if (op.kind === 'update') return [op.rowId]
  return []
}

/** Hvordan en endring som ikke er sendt ennå, ser ut i listen. */
function applyOp(op: Op, rows: unknown[]): unknown[] {
  const list = rows as Record<string, unknown>[]
  switch (op.kind) {
    case 'insert':
    case 'insertMinimal': {
      const row = op.kind === 'insert' && op.upload ? { ...op.row, [op.upload.field]: `local:${op.id}` } : op.row
      return list.some((r) => r.id === row.id) ? list : op.kind === 'insertMinimal' ? [row, ...list] : [...list, row]
    }
    case 'update':
      return list.map((r) => (r.id === op.rowId ? { ...r, ...op.patch, ...op.local } : r))
    case 'delete':
      return list.filter((r) => !op.ids.includes(r.id as string))
    case 'upsert':
      return list.map((r) => ({ ...r, ...op.fields }))
  }
}

function withPending(key: string, rows: unknown[]): unknown[] {
  return outbox.filter((op) => op.key === key).reduce((acc, op) => applyOp(op, acc), rows)
}

/** Legger en endring i utboksen, viser den med en gang og prøver å sende. */
function enqueue(op: Op): Promise<void> {
  outbox = [...outbox, op]
  outboxChanged()
  patchLocal(op.key, (rows) => applyOp(op, rows))
  const done = new Promise<void>((resolve, reject) => waiting.set(op.id, { resolve, reject }))
  void flush()
  return done
}

let flushing: Promise<void> | null = null

/** Sender utboksen i rekkefølge. Stopper ved første nettfeil og prøver igjen senere. */
export function flush(): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      await loadOutbox()
      const touched = new Set<string>()
      let sentAny = false
      while (outbox.length) {
        const op = outbox[0]
        try {
          await send(op)
        } catch (error) {
          if (isNetworkError(error)) {
            markOffline()
            // Skjermen kan gå videre; endringen sendes når nettet er tilbake.
            for (const o of outbox) settle(o.id)
            break
          }
          // Serveren sa nei (f.eks. ingen tilgang): dropp endringen og hent fasit.
          outbox = outbox.slice(1)
          outboxChanged()
          touched.add(op.key)
          if (!settle(op.id, error)) errorListeners.forEach((l) => l(describe(op)))
          continue
        }
        markOnline()
        sentAny = true
        outbox = outbox.slice(1)
        outboxChanged()
        touched.add(op.key)
        settle(op.id)
      }
      // Hent det serveren har lagret (f.eks. hvem som krysset av og når).
      touched.forEach(load)
      if (sentAny && !outbox.length && !sync.offline) {
        setSync({ synced: true })
        clearTimeout(syncedTimer)
        syncedTimer = setTimeout(() => setSync({ synced: false }), 3000)
      }
    })().finally(() => {
      flushing = null
    })
  }
  return flushing
}

/** Gir beskjed til skjermen som venter på denne endringen. Usann hvis ingen ventet. */
function settle(opId: string, error?: unknown): boolean {
  const w = waiting.get(opId)
  if (!w) return false
  waiting.delete(opId)
  if (error) w.reject(error)
  else w.resolve()
  return true
}

function describe(op: Op): string {
  if (op.kind === 'delete') return 'Noe ble ikke slettet fordi du ikke har tilgang lenger.'
  return 'En endring du gjorde uten nett ble ikke lagret. Listen er oppdatert.'
}

class Rejected extends Error {}

async function send(op: Op): Promise<void> {
  switch (op.kind) {
    case 'insert': {
      let row: Record<string, unknown> = op.row
      if (op.upload) {
        const u = op.upload
        // Samme sti hver gang, så et nytt forsøk etter brudd ikke lager en ekstra fil.
        const path = `${u.cabinId}/${u.folder}/${op.id}.${u.ext}`
        const { error } = await supabase.storage.from('cabin-files').upload(path, u.file, { contentType: u.type, upsert: true })
        if (error) throw error
        row = { ...row, [u.field]: path }
      }
      const { error } = await supabase.from(op.table).insert(row as never)
      // 23505: raden finnes allerede (forrige forsøk kom fram, men svaret gjorde det ikke).
      if (error && error.code !== '23505') throw error
      return
    }
    case 'insertMinimal': {
      const { error } = await supabase.from(op.table).insert(op.row as never)
      if (error && error.code !== '23505') throw error
      return
    }
    case 'update': {
      const { data, error } = await supabase.from(op.table).update(op.patch as never).eq('id', op.rowId).select('id')
      if (error) throw error
      if (!data?.length) throw new Rejected('Ingen tilgang')
      return
    }
    case 'delete': {
      const { data, error } = await supabase.from(op.table).delete().in('id', op.ids).select('id')
      if (error) throw error
      if ((data ?? []).length < op.ids.length) throw new Rejected('Ingen tilgang')
      return
    }
    case 'upsert': {
      const { error } = await supabase.from(op.table).upsert({ ...op.match, ...op.fields } as never, { onConflict: op.conflict })
      if (error) throw error
      return
    }
  }
}

// ---------------------------------------------------------------------------
// Det skjermene bruker
// ---------------------------------------------------------------------------

export const tableKey = (table: ContentTable, cabinId: string) => `${table}:${cabinId}`

export function useTable<T extends Row>(table: ContentTable, cabinId: string): Snapshot<T> {
  return useQuery<T>(tableKey(table, cabinId), async () => {
    const { data, error } = await supabase.from(table).select('*').eq('cabin_id', cabinId).order('created_at')
    if (error) throw error
    return data as T[]
  })
}

/**
 * Legger til en rad. Løftet holder når raden er lagret eller lagt i utboksen
 * (uten nett), og feiler bare hvis serveren sier nei.
 */
export function insertRow<T extends Row>(table: ContentTable, row: T, upload?: { file: File; folder: string; field: keyof T & string }): Promise<void> {
  const id = crypto.randomUUID()
  const up = upload && {
    file: upload.file,
    cabinId: row.cabin_id,
    folder: upload.folder,
    field: upload.field,
    type: upload.file.type,
    ext: upload.file.type === 'image/jpeg' ? 'jpg' : upload.file.type === 'application/pdf' ? 'pdf' : (upload.file.name.split('.').pop() ?? 'bin'),
  }
  return enqueue({ id, key: tableKey(table, row.cabin_id), kind: 'insert', table, row, upload: up })
}

/** Endrer en rad. `local` er det som vises før serveren svarer (f.eks. «Kjøpt av» meg). */
export function updateRow<T extends Row>(table: ContentTable, cabinId: string, id: string, patch: Partial<T>, local: Partial<T> = {}): Promise<void> {
  return updateRecord(tableKey(table, cabinId), table, id, patch, local)
}

/** Endrer en rad i en hvilken som helst tabell; `key` er listen som viser den (raden må ha `id`). */
export function updateRecord(key: string, table: string, id: string, patch: object, local: object = {}): Promise<void> {
  return enqueue({ id: crypto.randomUUID(), key, kind: 'update', table, rowId: id, patch, local })
}

/** Sletter rader. Rader serveren ikke lot oss slette, kommer tilbake. */
export function deleteRows(table: ContentTable, cabinId: string, ids: string[]): Promise<void> {
  if (!ids.length) return Promise.resolve()
  return enqueue({ id: crypto.randomUUID(), key: tableKey(table, cabinId), kind: 'delete', table, ids })
}

/** Lagrer én rad per hytte (info og koder). */
export function upsertSingle(key: string, table: string, match: Record<string, string>, fields: object): Promise<void> {
  return enqueue({ id: crypto.randomUUID(), key, kind: 'upsert', table, conflict: Object.keys(match).join(','), match, fields })
}

/** Legger til en logg-rad som ikke trenger svar (nyeste først i listen). */
export function insertLog(key: string, table: string, row: Record<string, unknown> & { id: string }): Promise<void> {
  return enqueue({ id: crypto.randomUUID(), key, kind: 'insertMinimal', table, row })
}

/** Id-ene til rader som ikke er sendt ennå («Venter på nett»). */
export function usePendingIds(): ReadonlySet<string> {
  return useSyncExternalStore(
    (l) => {
      pendingListeners.add(l)
      return () => pendingListeners.delete(l)
    },
    () => pendingIds,
  )
}

/** Bilde eller fil som ligger i utboksen og ikke er lastet opp ennå. */
export function pendingFile(localPath: string): Blob | null {
  const opId = localPath.replace(/^local:/, '')
  const op = outbox.find((o) => o.id === opId)
  return op?.kind === 'insert' && op.upload ? op.upload.file : null
}

/** Blir varslet når en endring fra utboksen ble avvist etter at skjermen var gått videre. */
export function onSyncError(listener: SyncErrorListener): () => void {
  errorListeners.add(listener)
  return () => errorListeners.delete(listener)
}

/** Ved utlogging: glem lagrede data og endringer som ikke er sendt. */
export async function clearLocalData() {
  outbox = []
  outboxChanged()
  entries.clear()
  await idbClear()
}

/**
 * Når en hytte er slettet: glem lagrede lister, filer og endringer som ikke er sendt.
 * Ny farge (profiles) gjelder alle hyttene og beholdes.
 */
export async function forgetCabin(cabinId: string) {
  await loadOutbox()
  const dropped = outbox.filter((op) => op.key.includes(cabinId) && op.table !== 'profiles')
  if (dropped.length) {
    outbox = outbox.filter((op) => !dropped.includes(op))
    outboxChanged()
    dropped.forEach((op) => settle(op.id))
  }
  for (const key of [...entries.keys()]) if (key.includes(cabinId)) entries.delete(key)
  await idbDelWhere((key) => key.includes(cabinId))
  try {
    for (const key of Object.keys(localStorage)) if (key.includes(cabinId)) localStorage.removeItem(key)
  } catch {
    // Ikke viktig: avkryssingene i sjekklisten blir bare liggende.
  }
}

if (typeof window !== 'undefined') {
  const retry = () => {
    void flush()
    reloadAll()
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retry()
  })
  window.addEventListener('online', () => {
    markOnline()
    retry()
  })
  window.addEventListener('offline', markOffline)
  // Dårlig dekning: «online» kommer ikke alltid. Prøv igjen jevnlig så lenge noe venter.
  setInterval(() => {
    if (outbox.length || sync.offline) retry()
  }, 15_000)
  void flush()
}
