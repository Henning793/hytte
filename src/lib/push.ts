import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Push-varsler. Av til personen selv slår dem på. «På» gjelder denne enheten
// (nettleseren har et abonnement); hvilke varsler man vil ha gjelder personen.
// At personen har slått på varsler, huskes i databasen (push_enabled), så de
// slås på igjen av seg selv etter utlogging, tømt buffer eller ny telefon-start.

export type PushPrefs = {
  issues: boolean
  events: boolean
  reminders: boolean
  trip: boolean
  stays: boolean
  tasks: boolean
}

/** Det man får når man slår på varsler. Samme standard som i databasen. */
export const DEFAULT_PREFS: PushPrefs = { issues: true, events: true, reminders: true, trip: true, stays: false, tasks: false }

export const PREF_LABELS: { key: keyof PushPrefs; label: string; meta: string }[] = [
  { key: 'issues', label: 'Ny feil', meta: 'Når noen melder at noe er ødelagt' },
  { key: 'events', label: 'Ny hendelse i kalenderen', meta: 'F.eks. dugnad' },
  { key: 'reminders', label: 'Påminnelse dagen før', meta: 'Om hendelser i kalenderen' },
  { key: 'trip', label: 'Dagen før jeg skal på hytta', meta: 'Sjekk handleliste og oppgaver før du drar' },
  { key: 'stays', label: 'Noen skal på hytta', meta: 'Når et opphold legges inn' },
  { key: 'tasks', label: 'Ny oppgave', meta: 'Når noen legger til en oppgave som ikke er en feil' },
]

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** iPhone og iPad (iPadOS later som den er en Mac, men har berøringsskjerm). */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)

/** Åpnet fra hjemskjermen, ikke i nettleseren. */
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

async function deviceSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

// Pågående gjenoppretting etter innlogging, så skjermen ikke viser «Av» midt i den.
let restoring: Promise<void> = Promise.resolve()

/** Er varsler på for denne enheten? Null mens det sjekkes. */
export function usePushEnabled(): [boolean | null, (on: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    // Venter på gjenopprettingen, men ikke i det uendelige.
    const waited = Promise.race([restoring, new Promise((r) => setTimeout(r, 5000))])
    waited.then(deviceSubscription).then(
      (s) => setEnabled(Boolean(s) && Notification.permission === 'granted'),
      () => setEnabled(false),
    )
  }, [])
  return [enabled, setEnabled]
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export type EnableResult = 'on' | 'denied' | 'not-ready'

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Husker på personen om varsler er slått på. Valgene av varsler står urørt. */
async function saveWanted(on: boolean): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: userId, push_enabled: on })
  if (error) throw error
}

/** Spør om lov og abonnerer. Må kalles fra et trykk (iPhone krever det). */
export async function enablePush(): Promise<EnableResult> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const result = await subscribeDevice()
  if (result === 'on') await saveWanted(true)
  return result
}

/** Abonnerer enheten (gjenbruker abonnementet den har) og lagrer det på meg. */
async function subscribeDevice(): Promise<'on' | 'not-ready'> {
  const { data: key, error } = await supabase.rpc('push_public_key')
  if (error) throw error
  if (!key) return 'not-ready'
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) })
  }
  const json = sub.toJSON()
  const { error: saveError } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
  })
  if (saveError) throw saveError
  return 'on'
}

/** Slår av varsler på denne enheten. Virker også uten nett, så langt det går. */
export async function disablePush(): Promise<void> {
  await saveWanted(false)
  const sub = await deviceSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe().catch(() => undefined)
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  }
}

/**
 * Ved utlogging: enheten skal ikke få varsler for denne personen lenger, men
 * personens valg står, så varslene kommer tilbake ved neste innlogging.
 * Abonnementet i nettleseren beholdes, så det kan tas i bruk igjen uten å spørre.
 */
export async function forgetDevice(): Promise<void> {
  const sub = await deviceSubscription()
  if (!sub) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  // Uten nett: avslutt abonnementet, så varslene ikke når fram likevel.
  if (error) await sub.unsubscribe().catch(() => undefined)
}

/**
 * Etter innlogging: hadde personen varsler på, og har telefonen fortsatt gitt
 * lov, slås de på igjen for denne enheten uten at man trenger å gjøre noe.
 */
export function restorePush(): Promise<void> {
  restoring = (async () => {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const { data } = await supabase.from('notification_prefs').select('push_enabled').maybeSingle()
    if (!data?.push_enabled) return
    await subscribeDevice()
  })().catch(() => undefined)
  return restoring
}

export async function loadPrefs(): Promise<PushPrefs> {
  const { data, error } = await supabase.from('notification_prefs').select('issues, events, reminders, trip, stays, tasks').maybeSingle()
  if (error) throw error
  return data ?? DEFAULT_PREFS
}

export async function savePrefs(userId: string, prefs: PushPrefs): Promise<void> {
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: userId, ...prefs })
  if (error) throw error
}
