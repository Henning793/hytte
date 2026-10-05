const weekdayDate = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })
const fullDate = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** «i dag», «i går», «i morgen», ellers «fre. 10. okt.» (med år hvis det ikke er i år). */
export function formatDay(value: string | Date): string {
  // En ren dato («2026-10-10») tolkes som lokal dato, ikke UTC.
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00`) : new Date(value)
  const days = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000)
  if (days === 0) return 'i dag'
  if (days === -1) return 'i går'
  if (days === 1) return 'i morgen'
  return date.getFullYear() === new Date().getFullYear() ? weekdayDate.format(date) : fullDate.format(date)
}

export function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/** «2,1 MB», «340 kB». */
export function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}
