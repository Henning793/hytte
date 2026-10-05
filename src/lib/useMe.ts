import { useAuth } from './auth'

/** Innlogget brukers id. Brukes bare bak RequireAuth. */
export function useMe(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Ikke innlogget')
  return session.user.id
}
