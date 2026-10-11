import { useState, useSyncExternalStore } from 'react'
import type { User } from '@supabase/supabase-js'

/**
 * Velkomstintroen: vises én gang for nye brukere første gang de kommer inn i en
 * hytte, og kan spilles av igjen fra «Tips og triks» under Mer.
 */

// Brukere som fantes før introen kom, kjenner appen allerede.
const INTRO_FROM = '2026-10-11'
const seenKey = (userId: string) => `hytte.intro-sett.${userId}`

// localStorage kan kaste (privat modus, blokkert lagring). Da vises introen
// heller én gang for mye enn at appen krasjer.
function seen(userId: string) {
  try {
    return localStorage.getItem(seenKey(userId)) !== null
  } catch {
    return false
  }
}

function markSeen(userId: string) {
  try {
    localStorage.setItem(seenKey(userId), '1')
  } catch {
    // Se seen.
  }
}

let replaying = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** «Se introen på nytt». */
export function replayIntro() {
  replaying = true
  emit()
}

/** Om introen skal vises nå, og en funksjon som lukker den for godt. */
export function useIntro(user: User | undefined): [open: boolean, close: () => void] {
  const replay = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => replaying,
  )
  const [isNew, setIsNew] = useState(() => !!user && user.created_at >= INTRO_FROM && !seen(user.id))

  function close() {
    if (user) markSeen(user.id)
    setIsNew(false)
    replaying = false
    emit()
  }

  return [replay || isNew, close]
}
