import { useSyncExternalStore } from 'react'
import { insertLog, useQuery } from './data'
import { supabase } from './supabase'
import type { ChecklistKind, ChecklistRun } from './types'

// Avkryssingen er personlig og ligger bare på denne telefonen (se HANDOVER, punkt 10).
const storageKey = (cabinId: string, kind: ChecklistKind) => `hytte.sjekk.${cabinId}.${kind}`
const listeners = new Set<() => void>()
const cache = new Map<string, string[]>()

function read(key: string): string[] {
  if (!cache.has(key)) {
    let ids: string[] = []
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === 'string')
    } catch {
      // Ødelagt eller blokkert lagring: start med tom liste.
    }
    cache.set(key, ids)
  }
  return cache.get(key)!
}

function write(key: string, ids: string[]) {
  cache.set(key, ids)
  try {
    if (ids.length) localStorage.setItem(key, JSON.stringify(ids))
    else localStorage.removeItem(key)
  } catch {
    // Privat modus o.l.: avkryssingen virker til siden lukkes.
  }
  listeners.forEach((l) => l())
}

export function useTicks(cabinId: string, kind: ChecklistKind) {
  const key = storageKey(cabinId, kind)
  const ticks = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => read(key),
  )
  return {
    ticks,
    toggle: (id: string) => write(key, ticks.includes(id) ? ticks.filter((x) => x !== id) : [...ticks, id]),
    reset: () => write(key, []),
  }
}

export const runsKey = (cabinId: string) => `checklist_runs:${cabinId}`

/** De siste gjennomgangene, nyeste først. */
export function useRuns(cabinId: string) {
  return useQuery<ChecklistRun>(runsKey(cabinId), async () => {
    const { data, error } = await supabase
      .from('checklist_runs')
      .select('*')
      .eq('cabin_id', cabinId)
      .order('completed_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return data as ChecklistRun[]
  }).rows
}

export function logRun(cabinId: string, kind: ChecklistKind, userId: string): Promise<void> {
  const run: ChecklistRun = { id: crypto.randomUUID(), cabin_id: cabinId, kind, completed_by: userId, completed_at: new Date().toISOString() }
  return insertLog(runsKey(cabinId), 'checklist_runs', run)
}
