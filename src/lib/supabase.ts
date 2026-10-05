import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Mangler nøklene, kjører appen uten backend (f.eks. lokalt før Supabase er satt opp). */
export const supabaseConfigured = Boolean(url && anonKey)

/** Leses før Supabase fjerner tokenet fra adressen. */
export const openedFromRecoveryLink = window.location.hash.includes('type=recovery')

export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'mangler-nokkel', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Implicit flow: lenken i «Glemt passord»-e-posten virker også om den åpnes
    // på en annen telefon enn den som ba om den.
    flowType: 'implicit',
  },
})
