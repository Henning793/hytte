import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'

type FromState = { from?: string } | null

/** Skjermer inne i appen: krever innlogging. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (recovering) return <Navigate to="/nytt-passord" replace />
  if (!session) {
    return <Navigate to="/velkommen" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

/** Velkommen, Logg inn osv.: den som allerede er innlogget sendes videre. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (session && !recovering) {
    return <Navigate to={(location.state as FromState)?.from ?? '/'} replace />
  }
  return children
}
