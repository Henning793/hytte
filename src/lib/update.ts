import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Oppdatering av appen. Service workeren ser etter ny versjon når appen kommer
 * i forgrunnen og hver time. En ny versjon venter til brukeren trykker «Oppdater»,
 * så ingenting man holder på med blir borte midt i.
 */

const HOUR = 60 * 60 * 1000

let needRefresh = false
let registration: ServiceWorkerRegistration | undefined
const listeners = new Set<() => void>()

function setNeedRefresh() {
  if (needRefresh) return
  needRefresh = true
  listeners.forEach((l) => l())
}

const updateSW =
  'serviceWorker' in navigator
    ? registerSW({
        onNeedRefresh: setNeedRefresh,
        onRegisteredSW(_url, reg) {
          registration = reg
          setInterval(() => void checkForUpdate(), HOUR)
        },
      })
    : undefined

// iPhone vekker hjemskjerm-appen fra minnet uten å laste den på nytt, så vi sjekker når den blir synlig.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate()
})

/** Om en ny versjon er lastet ned og venter. */
export function useUpdateReady() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => needRefresh,
  )
}

/** Bytter til den nye versjonen og laster appen på nytt. */
export function applyUpdate() {
  void updateSW?.(true)
}

/** Spør serveren om en ny versjon, og venter til den eventuelt er lastet ned. */
export async function checkForUpdate(): Promise<'update' | 'latest' | 'offline'> {
  if (needRefresh) return 'update'
  if (!registration) return 'latest'
  if (!navigator.onLine) return 'offline'
  try {
    await registration.update()
  } catch {
    return 'offline'
  }
  const sw = registration.installing
  if (sw) {
    await new Promise<void>((resolve) => {
      const done = () => {
        if (sw.state === 'installing') return
        sw.removeEventListener('statechange', done)
        resolve()
      }
      sw.addEventListener('statechange', done)
      done()
    })
  }
  if (registration.waiting && navigator.serviceWorker.controller) setNeedRefresh()
  return needRefresh ? 'update' : 'latest'
}

/** Versjon og byggetidspunkt, til visning under Mer. */
export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = new Date(__BUILD_TIME__)
