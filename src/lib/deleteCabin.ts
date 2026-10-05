import { forgetCabin } from './data'
import { BUCKET } from './files'
import { supabase } from './supabase'

/** Alle filer under en mappe i bucketen, også i undermapper. */
async function listFiles(prefix: string): Promise<string[]> {
  const paths: string[] = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: pageSize, offset })
    if (error) throw error
    for (const item of data ?? []) {
      // Mapper har ingen id.
      if (item.id === null) paths.push(...(await listFiles(`${prefix}/${item.name}`)))
      else paths.push(`${prefix}/${item.name}`)
    }
    if ((data ?? []).length < pageSize) return paths
  }
}

/**
 * Sletter hytta med alt innhold. Bare admin får lov (RLS).
 * Filene slettes først, for når hytta er borte, har ingen tilgang til dem lenger.
 * Alt annet i databasen forsvinner med hytta (on delete cascade).
 */
export async function deleteCabin(cabinId: string): Promise<void> {
  const files = await listFiles(cabinId)
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100))
    if (error) throw error
  }

  const { data, error } = await supabase.from('cabins').delete().eq('id', cabinId).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Bare admin kan slette hytta.')

  await forgetCabin(cabinId)
}
