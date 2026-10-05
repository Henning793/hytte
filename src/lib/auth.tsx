import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { openedFromRecoveryLink, supabase, supabaseConfigured } from './supabase'

type AuthState = {
  session: Session | null
  /** Fornavnet fra registreringen. Ligger i sesjonen, så det virker uten nett. */
  firstName: string
  /** True mens lagret sesjon leses inn ved oppstart. */
  loading: boolean
  /** True etter at brukeren har åpnet en «Glemt passord»-lenke. */
  recovering: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)
  const [recovering, setRecovering] = useState(openedFromRecoveryLink)

  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') setRecovering(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    session,
    firstName: (session?.user.user_metadata.first_name as string | undefined) ?? '',
    loading,
    recovering,
    // Lokal utlogging virker også uten nett.
    signOut: async () => {
      await supabase.auth.signOut({ scope: 'local' })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth må brukes inne i <AuthProvider>')
  return ctx
}
