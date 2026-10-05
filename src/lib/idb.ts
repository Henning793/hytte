// Et lite nøkkel/verdi-lager i IndexedDB. Brukes til siste kjente data,
// utboksen og filer som er åpnet før, så appen virker uten nett.
// Feiler IndexedDB (privat modus o.l.), virker appen som før, bare uten lagring.

const DB_NAME = 'hytte'
const STORE = 'kv'

let opening: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (!opening) {
    opening = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(STORE)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return opening
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined)
        try {
          const tx = db.transaction(STORE, mode)
          const req = fn(tx.objectStore(STORE))
          tx.oncomplete = () => resolve(req ? (req.result as T) : undefined)
          tx.onerror = () => resolve(undefined)
          tx.onabort = () => resolve(undefined)
        } catch {
          resolve(undefined)
        }
      }),
  )
}

export const idbGet = <T>(key: string) => run<T>('readonly', (s) => s.get(key))
export const idbSet = (key: string, value: unknown) => run<void>('readwrite', (s) => void s.put(value, key))
export const idbDel = (key: string) => run<void>('readwrite', (s) => void s.delete(key))
export const idbClear = () => run<void>('readwrite', (s) => void s.clear())
