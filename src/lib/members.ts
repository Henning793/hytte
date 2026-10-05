import { useMemo } from 'react'
import type { Role } from './cabins'
import { useQuery, type Snapshot } from './data'
import { supabase } from './supabase'

export type Member = { user_id: string; role: Role; first_name: string }

export const membersKey = (cabinId: string) => `members:${cabinId}`

async function fetchMembers(cabinId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('cabin_members')
    .select('user_id, role, profiles (first_name)')
    .eq('cabin_id', cabinId)
  if (error) throw error
  type Row = { user_id: string; role: Role; profiles: { first_name: string } | null }
  const list = ((data ?? []) as unknown as Row[]).map((r) => ({
    user_id: r.user_id,
    role: r.role,
    first_name: r.profiles?.first_name ?? 'Ukjent',
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
