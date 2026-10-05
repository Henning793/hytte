// Felles regler for kalenderen, brukt av både kalenderskjermen og Hjem.
import { overlaps } from './dates'
import type { CalendarEvent, Stay } from './types'

export const byStart = <T extends { start_date: string; end_date: string; id: string }>(a: T, b: T) =>
  a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date) || a.id.localeCompare(b.id)

/** Opphold og hendelser som berører perioden [from, to]. */
export function within<T extends { start_date: string; end_date: string }>(rows: T[] | null, from: string, to: string): T[] {
  return (rows ?? []).filter((r) => overlaps(r.start_date, r.end_date, from, to))
}

/**
 * Gir hvert opphold en fast «bane», så samme person ligger på samme høyde
 * gjennom hele oppholdet og strekene henger sammen fra dag til dag.
 */
export function assignLanes(stays: Stay[]): Map<string, number> {
  const lanes = new Map<string, number>()
  const laneEnds: string[] = []
  for (const s of [...stays].sort(byStart)) {
    let lane = laneEnds.findIndex((end) => end < s.start_date)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = s.end_date
    lanes.set(s.id, lane)
  }
  return lanes
}

/** «kl. 10.00» for hendelser med klokkeslett. */
export function formatTime(e: CalendarEvent): string | null {
  return e.start_time ? `kl. ${e.start_time.slice(0, 5).replace(':', '.')}` : null
}
