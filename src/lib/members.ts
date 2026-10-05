import { useMemo } from 'react'
import type { Role } from './cabins'
import { updateRecord, useQuery, type Snapshot } from './data'
import { supabase } from './supabase'

/** `id` er det samme som `user_id`, så endringer kan vises før de er sendt. */
export type Member = { id: string; user_id: string; role: Role; first_name: string; color: string | null; joined_at: string }

export const membersKey = (cabinId: string) => `members:${cabinId}`

async function fetchMembers(cabinId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('cabin_members')
    .select('user_id, role, joined_at, profiles (first_name, color)')
    .eq('cabin_id', cabinId)
  if (error) throw error
  type Row = { user_id: string; role: Role; joined_at: string; profiles: { first_name: string; color: string | null } | null }
  const list = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.user_id,
    user_id: r.user_id,
    role: r.role,
    joined_at: r.joined_at,
    first_name: r.profiles?.first_name ?? 'Ukjent',
    color: r.profiles?.color ?? null,
  }))
  // Admin først, deretter alfabetisk.
  return list.sort((a, b) =>
    a.role === b.role ? a.first_name.localeCompare(b.first_name, 'nb') : a.role === 'admin' ? -1 : 1,
  )
}

export function useMembers(cabinId: string): Snapshot<Member> {
  return useQuery(membersKey(cabinId), () => fetchMembers(cabinId))
}

/** Slår opp fornavn på en bruker i hytta. Tidligere medlemmer vises som «Tidligere medlem». */
export function useNames(cabinId: string): (userId: string | null | undefined) => string {
  const { rows } = useMembers(cabinId)
  return useMemo(() => {
    const names = new Map((rows ?? []).map((m) => [m.user_id, m.first_name]))
    return (userId: string | null | undefined) => {
      // Før medlemmene er hentet, vises ingen navn i stedet for et feil navn.
      if (!rows) return ''
      return userId ? (names.get(userId) ?? 'Tidligere medlem') : 'Ukjent'
    }
  }, [rows])
}

// ---------------------------------------------------------------------------
// Farger i kalenderen
// ---------------------------------------------------------------------------

/** Fargene man kan velge mellom. Godt synlige både i lyst og mørkt tema. */
export const PALETTE: { value: string; label: string }[] = [
  { value: '#2f6fb0', label: 'Blå' },
  { value: '#c0762a', label: 'Oransje' },
  { value: '#7b4fa0', label: 'Lilla' },
  { value: '#2e8b6e', label: 'Grønn' },
  { value: '#c2447a', label: 'Rosa' },
  { value: '#8a6d1f', label: 'Oliven' },
  { value: '#4a5bc4', label: 'Indigo' },
  { value: '#3f8f3a', label: 'Gressgrønn' },
  { value: '#b0503a', label: 'Rust' },
  { value: '#2a8a9a', label: 'Turkis' },
]

export const FORMER_MEMBER_COLOR = '#8a8a84'

/**
 * Fargen til hver person i hytta. Har man valgt selv, brukes den. Ellers får man
 * den første ledige i paletten, i den rekkefølgen folk ble med, så fargene ikke
 * bytter når noen nye kommer til.
 */
export function memberColors(members: Member[]): Map<string, string> {
  const colors = new Map<string, string>()
  const taken = new Set(members.map((m) => m.color).filter(Boolean))
  let next = 0
  for (const m of [...members].sort((a, b) => (a.joined_at ?? '').localeCompare(b.joined_at ?? ''))) {
    if (m.color) {
      colors.set(m.user_id, m.color)
      continue
    }
    const free = PALETTE.slice(next).findIndex((p) => !taken.has(p.value))
    const pick = free === -1 ? PALETTE[colors.size % PALETTE.length].value : PALETTE[next + free].value
    next = free === -1 ? next : next + free + 1
    taken.add(pick)
    colors.set(m.user_id, pick)
  }
  return colors
}

export function useColors(cabinId: string): (userId: string | null | undefined) => string {
  const { rows } = useMembers(cabinId)
  return useMemo(() => {
    const colors = memberColors(rows ?? [])
    return (userId) => (userId && colors.get(userId)) || FORMER_MEMBER_COLOR
  }, [rows])
}

/** Lagrer min farge (også uten nett). */
export function saveMyColor(cabinId: string, userId: string, color: string): Promise<void> {
  return updateRecord(membersKey(cabinId), 'profiles', userId, { color })
}
