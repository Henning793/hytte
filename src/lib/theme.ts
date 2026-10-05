import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'hytte.theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

let preference = readPreference()

function resolve(pref: ThemePreference): Theme {
  if (pref === 'system') return media.matches ? 'dark' : 'light'
  return pref
}

function apply() {
  document.documentElement.dataset.theme = resolve(preference)
  listeners.forEach((l) => l())
}

media.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Privat modus o.l.: temaet gjelder bare denne økten.
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Aktivt tema. Følger systemet til brukeren velger selv under Mer. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => resolve(preference))
}

apply()
