import { useEffect, useState } from 'react'
import { upsertSingle, useQuery } from './data'
import { infoKey } from './info'
import type { Ferry, FerryStop } from './types'

// Fergeavganger fra Entur (åpent API for all kollektivtrafikk i Norge, ingen nøkkel).
// Avgangene for de neste 14 dagene lagres som en vanlig liste i data.ts, så de
// vises også uten nett. Entur får nye tabeller fra selskapene selv, så ingen
// trenger å oppdatere noe når rutetabellen byttes.

const JOURNEY_PLANNER = 'https://api.entur.io/journey-planner/v3/graphql'
const GEOCODER = 'https://api.entur.io/geocoder/v1/autocomplete'
// Entur ber alle klienter si hvem de er.
const HEADERS = { 'ET-Client-Name': 'henning793-hytteappen' }

export const FERRY_DAYS = 14

export type Departure = {
  /** Avgang og ankomst etter rutetabellen (ISO med tidssone). */
  aimed: string
  aimedArrival: string
  /** Forventet avgang og ankomst (lik aimed uten sanntid). */
  expected: string
  expectedArrival: string
  cancelled: boolean
  /** Avgangen går bare når den er bestilt. */
  booking: boolean
  bookingNote: string | null
}

export type FerryNotice = { id: string; summary: string; description: string }

export type FerryData = {
  fetchedAt: string
  out: Departure[]
  home: Departure[]
  notices: FerryNotice[]
  operator: { name: string; url: string | null } | null
  bookingPhone: string | null
  bookingUrl: string | null
}

export type Direction = 'out' | 'home'

/** «Ut til hytta» går fra home til cabin, «Hjem» motsatt vei. */
export const legOf = (ferry: Ferry, dir: Direction) =>
  dir === 'out' ? { from: ferry.home, to: ferry.cabin } : { from: ferry.cabin, to: ferry.home }

export function saveFerry(cabinId: string, ferry: Ferry | null): Promise<void> {
  return upsertSingle(infoKey(cabinId), 'cabin_info', { cabin_id: cabinId }, { ferry })
}

export const ferryKey = (cabinId: string, ferry: Ferry) => `ferry:${cabinId}:${ferry.home.id}:${ferry.cabin.id}`

/** Avgangene begge veier. rows er null til noe er hentet eller lest fra lageret. */
export function useFerry(cabinId: string, ferry: Ferry | null): { data: FerryData | null; failed: boolean } {
  const key = ferry ? ferryKey(cabinId, ferry) : `ferry:${cabinId}:ingen`
  const { rows, failed } = useQuery<FerryData>(key, async () => (ferry ? [await fetchFerry(ferry)] : []))
  return { data: rows?.[0] ?? null, failed }
}

/** Tiden nå, oppdatert hvert minutt, så «neste ferge» flytter seg. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** Avganger som ikke har gått ennå (forventet tid, så en forsinket ferge regnes med). */
export const upcoming = (list: Departure[], now: number) =>
  list.filter((d) => Date.parse(d.expected) >= now - 60_000)

// ---------------------------------------------------------------------------
// Tid og dato i norsk tid, uansett hvor telefonen står innstilt
// ---------------------------------------------------------------------------

const clock = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
const isoDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Oslo' })

/** «14:10» */
export const formatClock = (iso: string) => clock.format(new Date(iso)).replace('.', ':')

/** «2026-10-07», dagen avgangen går i Norge. */
export const osloDay = (iso: string | number) => isoDay.format(new Date(iso))

// ---------------------------------------------------------------------------
// Henting
// ---------------------------------------------------------------------------

const QUERY = `
query ($home: String!, $cabin: String!, $start: DateTime!, $range: Int!) {
  home: stopPlace(id: $home) { ...calls }
  cabin: stopPlace(id: $cabin) { ...calls }
}
fragment calls on StopPlace {
  estimatedCalls(startTime: $start, timeRange: $range, numberOfDepartures: 500, includeCancelledTrips: true) {
    aimedDepartureTime
    expectedDepartureTime
    cancellation
    forBoarding
    stopPositionInPattern
    quay { stopPlace { id } }
    bookingArrangements { bookingNote bookingContact { phone url } }
    situations { id summary { value language } description { value language } }
    serviceJourney {
      line { authority { name url } }
      passingTimes {
        quay { stopPlace { id } }
        arrival { time dayOffset }
        departure { time dayOffset }
        forAlighting
        bookingArrangements { bookingNote bookingContact { phone url } }
      }
    }
  }
}`

type Text = { value: string; language: string | null }
type Booking = { bookingNote: string | null; bookingContact: { phone: string | null; url: string | null } | null } | null
type Passing = {
  quay: { stopPlace: { id: string } | null }
  arrival: { time: string | null; dayOffset: number | null } | null
  departure: { time: string | null; dayOffset: number | null } | null
  forAlighting: boolean
  bookingArrangements: Booking
}
type Call = {
  aimedDepartureTime: string
  expectedDepartureTime: string
  cancellation: boolean
  forBoarding: boolean
  stopPositionInPattern: number
  quay: { stopPlace: { id: string } | null }
  bookingArrangements: Booking
  situations: { id: string; summary: Text[]; description: Text[] }[]
  serviceJourney: { line: { authority: { name: string; url: string | null } | null }; passingTimes: (Passing | null)[] }
}
type Response = { data?: { home: { estimatedCalls: Call[] } | null; cabin: { estimatedCalls: Call[] } | null }; errors?: { message: string }[] }

async function fetchFerry(ferry: Ferry): Promise<FerryData> {
  const res = await fetch(JOURNEY_PLANNER, {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { home: ferry.home.id, cabin: ferry.cabin.id, start: new Date().toISOString(), range: FERRY_DAYS * 86_400 },
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`)
  const json = (await res.json()) as Response
  if (!json.data?.home || !json.data.cabin) throw new Error(json.errors?.[0]?.message ?? 'Fant ikke brygga hos Entur')

  const all = [...json.data.home.estimatedCalls, ...json.data.cabin.estimatedCalls]
  const notices = new Map<string, FerryNotice>()
  for (const c of all) {
    for (const s of c.situations) {
      if (!notices.has(s.id)) notices.set(s.id, { id: s.id, summary: pick(s.summary), description: pick(s.description) })
    }
  }
  const authority = all.find((c) => c.serviceJourney.line.authority)?.serviceJourney.line.authority ?? null
  const contact = all
    .flatMap((c) => [c.bookingArrangements, ...c.serviceJourney.passingTimes.map((p) => p?.bookingArrangements ?? null)])
    .find((b) => b?.bookingContact?.phone || b?.bookingContact?.url)?.bookingContact

  return {
    fetchedAt: new Date().toISOString(),
    out: trips(json.data.home.estimatedCalls, ferry.home.id, ferry.cabin.id),
    home: trips(json.data.cabin.estimatedCalls, ferry.cabin.id, ferry.home.id),
    notices: [...notices.values()].filter((n) => n.summary || n.description),
    operator: authority,
    bookingPhone: contact?.phone ?? null,
    bookingUrl: contact?.url ?? null,
  }
}

/** Norsk tekst om den finnes, ellers den første. */
const pick = (texts: Text[]) =>
  (texts.find((t) => /^(no|nb|nob|nor)/i.test(t.language ?? '')) ?? texts[0])?.value?.trim() ?? ''

const seconds = (t: { time: string | null; dayOffset: number | null } | null) => {
  if (!t?.time) return null
  const [h, m, s] = t.time.split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0) + (t.dayOffset ?? 0) * 86_400
}

const plus = (iso: string, secs: number) => new Date(Date.parse(iso) + secs * 1000).toISOString()

/** Avgangene fra «from» som stopper ved «to» senere på samme tur. */
function trips(calls: Call[], from: string, to: string): Departure[] {
  const result: Departure[] = []
  for (const c of calls) {
    if (!c.forBoarding || c.quay.stopPlace?.id !== from) continue
    const stops = c.serviceJourney.passingTimes
    let at = c.stopPositionInPattern
    if (stops[at]?.quay.stopPlace?.id !== from) at = stops.findIndex((p) => p?.quay.stopPlace?.id === from)
    if (at < 0) continue
    const arrival = stops.slice(at + 1).find((p) => p?.quay.stopPlace?.id === to && p.forAlighting)
    const leave = seconds(stops[at]?.departure ?? null)
    const reach = seconds(arrival?.arrival ?? arrival?.departure ?? null)
    if (!arrival || leave === null || reach === null) continue
    const booking = c.bookingArrangements ?? stops[at]?.bookingArrangements ?? arrival.bookingArrangements
    result.push({
      aimed: c.aimedDepartureTime,
      aimedArrival: plus(c.aimedDepartureTime, reach - leave),
      expected: c.expectedDepartureTime,
      expectedArrival: plus(c.expectedDepartureTime, reach - leave),
      cancelled: c.cancellation,
      booking: Boolean(booking),
      bookingNote: booking?.bookingNote?.trim() || null,
    })
  }
  return result.sort((a, b) => a.aimed.localeCompare(b.aimed))
}

// ---------------------------------------------------------------------------
// Søk etter brygger
// ---------------------------------------------------------------------------

type Feature = { properties: { id: string; name: string; label?: string; category?: string[] } }

/** Fergeleier og kaier hos Entur som passer søket. */
export async function searchFerryStops(text: string): Promise<(FerryStop & { label: string })[]> {
  const url = `${GEOCODER}?text=${encodeURIComponent(text)}&size=20&layers=venue&lang=no`
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`)
  const json = (await res.json()) as { features: Feature[] }
  return json.features
    .filter((f) => f.properties.id.startsWith('NSR:StopPlace:'))
    .filter((f) => f.properties.category?.some((c) => c === 'ferryStop' || c === 'harbourPort'))
    .map((f) => ({ id: f.properties.id, name: shortName(f.properties.name), label: f.properties.label ?? f.properties.name }))
}

/** «Nedgården fergeleie» → «Nedgården». */
export const shortName = (name: string) => name.replace(/\s+(fergeleie|ferjeleie|ferjekai|fergekai|kai|brygge)$/i, '') || name
