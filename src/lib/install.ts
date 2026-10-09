import { useSyncExternalStore } from 'react'

/**
 * «Installer appen»: finner ut hvordan Hytteappen kan installeres fra nettleseren
 * brukeren sitter i, og husker om kortet på Hjem er lukket.
 *
 * - Chrome/Edge (Android og PC) sender `beforeinstallprompt`, som lar oss åpne
 *   nettleserens egen installeringsdialog fra vår egen knapp.
 * - iOS har ikke noe slikt API. Der må brukeren selv velge «Legg til på
 *   Hjem-skjerm» fra Del-menyen i Safari, så vi viser en veiledning.
 */

// `beforeinstallprompt` er ikke en del av lib.dom.d.ts ennå.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 'prompt':     nettleseren har gitt oss en installeringsdialog vi kan åpne
// 'ios-safari': vis veiledningen for Del-menyen
// 'ios-other':  annen nettleser på iOS – be brukeren åpne siden i Safari
// 'none':       allerede installert, eller nettleseren støtter ikke installering
export type InstallMethod = 'prompt' | 'ios-safari' | 'ios-other' | 'none'

// iPadOS utgir seg for å være en Mac, men en Mac har ikke berøringsskjerm.
function isIos(userAgent: string, maxTouchPoints: number) {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

// Andre nettlesere og innebygde nettlesere i apper (Facebook, Messenger,
// Instagram, Snapchat …) på iOS. Alle har «Safari» i user agent-en, så de må
// utelukkes ved navn.
const IOS_NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\/|FBAN|FBAV|FB_IAB|Instagram|Snapchat|Line\/|MicroMessenger/

const DISMISSED_KEY = 'hytte.installer-lukket'

let promptEvent: BeforeInstallPromptEvent | null = null
let installed = false
let state: { method: InstallMethod; dismissed: boolean } = { method: 'none', dismissed: false }
const listeners = new Set<() => void>()

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari på iOS sin egen variant.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function method(): InstallMethod {
  if (installed || isStandalone()) return 'none'
  if (promptEvent) return 'prompt'
  const ua = navigator.userAgent
  if (!isIos(ua, navigator.maxTouchPoints)) return 'none'
  return /Safari/.test(ua) && !IOS_NON_SAFARI.test(ua) ? 'ios-safari' : 'ios-other'
}

// localStorage kan kaste (privat modus, blokkert lagring). Da vises kortet
// bare igjen neste gang, i stedet for at appen krasjer.
function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) !== null
  } catch {
    return false
  }
}

function refresh() {
  state = { method: method(), dismissed: isDismissed() }
  listeners.forEach((l) => l())
}

// `beforeinstallprompt` kan komme før React har tegnet noe, så det lyttes fra
// modulen lastes (importert i main.tsx) og ikke fra en komponent.
window.addEventListener('beforeinstallprompt', (event) => {
  // Hindrer nettleserens egen mini-infolinje; vi viser vårt eget kort.
  event.preventDefault()
  promptEvent = event as BeforeInstallPromptEvent
  refresh()
})
window.addEventListener('appinstalled', () => {
  promptEvent = null
  installed = true
  refresh()
})
refresh()

/** Hvordan appen kan installeres her, og om kortet på Hjem er lukket. */
export function useInstallState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

/** Åpner nettleserens installeringsdialog. Hendelsen kan bare brukes én gang. */
export async function promptInstall() {
  const event = promptEvent
  if (!event) return
  promptEvent = null
  await event.prompt()
  await event.userChoice.catch(() => undefined)
  refresh()
}

/** Lukker kortet på Hjem for godt. «Installer appen» under Mer blir værende. */
export function dismissInstall() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Se isDismissed.
  }
  refresh()
}
