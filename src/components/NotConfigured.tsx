import { supabaseConfigured } from '../lib/supabase'
import { FieldError } from './Field'

/** Vises bare når appen kjører uten Supabase-nøkler (se README). */
export function NotConfigured() {
  if (supabaseConfigured) return null
  return (
    <FieldError message="Appen er ikke koblet til Supabase ennå. Legg inn VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY (se README)." />
  )
}
