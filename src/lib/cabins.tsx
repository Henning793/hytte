import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { supabase, supabaseConfigured } from './supabase'

export type Role = 'admin' | 'member'

export type Cabin = {
  id: string
  name: string
  photo_path: string | null
  role: Role
  member_count: number
}

type CabinState = {
  cabins: Cabin[]
  /** Valgt hytte. Null bare når brukeren ikke er med i noen. */
  current: Cabin | null
  /** True til hyttelisten er lest første gang (fra nett eller lager). */
  loading: boolean
  select: (cabinId: string) => void
  refresh: () => Promise<Cabin[]>
}

const CabinContext = createContext<CabinState | null>(null)

const SELECTED_KEY = 'hytte.cabin'
const cacheKey = (userId: string) => `hytte.cabins.${userId}`

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Fullt lager eller privat modus: hyttelisten hentes på nytt neste gang.
  }
}

async function fetchCabins(userId: string): Promise<Cabin[]> {
  const { data: mine, error } = await supabase
    .from('cabin_members')
    .select('role, cabins (id, name, photo_path)')
    .eq('user_id', userId)
  if (error) throw error

  // RLS gir bare medlemmer av mine hytter, så dette teller medlemmer per hytte.
  const { data: all, error: countError } = await supabase.from('cabin_members').select('cabin_id')
  if (countError) throw countError
  const counts = new Map<string, number>()
  for (const row of all ?? []) counts.set(row.cabin_id, (counts.get(row.cabin_id) ?? 0) + 1)

  type Row = { role: Role; cabins: { id: string; name: string; photo_path: string | null } | null }
  return ((mine ?? []) as unknown as Row[])
    .filter((r) => r.cabins)
    .map((r) => ({ ...r.cabins!, role: r.role, member_count: counts.get(r.cabins!.id) ?? 1 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
}

export function CabinProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  // Hyttelisten fra nett, merket med hvem den gjelder for.
  const [fetched, setFetched] = useState<{ userId: string; cabins: Cabin[] } | null>(null)
  const [failedFor, setFailedFor] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(SELECTED_KEY))

  // Sist kjente hytter vises med en gang, også uten nett.
  const cached = useMemo(() => (userId ? readJson<Cabin[]>(cacheKey(userId)) : null), [userId])

  const store = useCallback((forUser: string, list: Cabin[]) => {
    setFetched({ userId: forUser, cabins: list })
    writeJson(cacheKey(forUser), list)
  }, [])

  useEffect(() => {
    if (!userId || !supabaseConfigured) return
    let active = true
    fetchCabins(userId).then(
      (list) => active && store(userId, list),
      () => active && setFailedFor(userId),
    )
    return () => {
      active = false
    }
  }, [userId, store])

  const refresh = useCallback(async () => {
    if (!userId) return []
    try {
      const list = await fetchCabins(userId)
      store(userId, list)
      return list
    } catch {
      return fetched?.userId === userId ? fetched.cabins : (cached ?? [])
    }
  }, [userId, store, fetched, cached])

  const select = useCallback((cabinId: string) => {
    setSelectedId(cabinId)
    try {
      localStorage.setItem(SELECTED_KEY, cabinId)
    } catch {
      // Ikke viktig: da velges første hytte neste gang.
    }
  }, [])

  const value = useMemo<CabinState>(() => {
    const cabins = !userId ? [] : fetched?.userId === userId ? fetched.cabins : (cached ?? [])
    const settled = fetched?.userId === userId || cached !== null || failedFor === userId || !supabaseConfigured
    return {
      cabins,
      current: cabins.find((c) => c.id === selectedId) ?? cabins[0] ?? null,
      loading: Boolean(userId) && !settled,
      select,
      refresh,
    }
  }, [userId, fetched, cached, failedFor, selectedId, select, refresh])

  return <CabinContext.Provider value={value}>{children}</CabinContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCabins(): CabinState {
  const ctx = useContext(CabinContext)
  if (!ctx) throw new Error('useCabins må brukes inne i <CabinProvider>')
  return ctx
}

/** Valgt hytte. Brukes bare på skjermer bak RequireCabin. */
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentCabin(): Cabin {
  const { current } = useCabins()
  if (!current) throw new Error('Ingen hytte valgt')
  return current
}
