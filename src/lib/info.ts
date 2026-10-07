import { upsertSingle, useQuery } from './data'
import { supabase } from './supabase'
import type { CabinInfo } from './types'

export const infoKey = (cabinId: string) => `cabin_info:${cabinId}`

/** Info og koder for hytta: én rad per hytte (lages sammen med hytta). */
export function useCabinInfo(cabinId: string): { info: CabinInfo | null; loaded: boolean } {
  const { rows } = useQuery<CabinInfo>(infoKey(cabinId), async () => {
    const { data, error } = await supabase.from('cabin_info').select('*').eq('cabin_id', cabinId).maybeSingle()
    if (error) throw error
    return data ? [data as CabinInfo] : []
  })
  return { info: rows?.[0] ?? null, loaded: rows !== null }
}

export type InfoFields = Omit<CabinInfo, 'cabin_id' | 'ferry' | 'updated_by' | 'updated_at'>

export function saveInfo(cabinId: string, fields: InfoFields): Promise<void> {
  return upsertSingle(infoKey(cabinId), 'cabin_info', { cabin_id: cabinId }, fields)
}
