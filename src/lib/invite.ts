// Invitasjonskoden huskes gjennom registrering og innlogging.
const KEY = 'hytte.invite'

export function rememberInvite(token: string) {
  try {
    sessionStorage.setItem(KEY, token)
  } catch {
    // Uten lager må brukeren åpne lenken på nytt etter innlogging.
  }
}

export function pendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function forgetInvite() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Ingenting å gjøre.
  }
}

export function inviteLink(token: string) {
  return `${window.location.origin}/bli-med/${token}`
}

/** Henter koden fra en innlimt lenke («…/bli-med/<kode>»). */
export function parseInviteLink(text: string): string | null {
  const match = text.trim().match(/bli-med\/([A-Za-z0-9_-]{8,})/)
  return match ? match[1] : null
}

/** «Virker i 23 timer til (til kl. 18:09 i morgen)», eller null når lenken er utløpt. */
export function inviteValidity(expiresAt: string, now: number = Date.now()): string | null {
  const end = new Date(expiresAt)
  const ms = end.getTime() - now
  if (!(ms > 0)) return null
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  const left = hours >= 1
    ? `${hours} ${hours === 1 ? 'time' : 'timer'}`
    : `${minutes} ${minutes === 1 ? 'minutt' : 'minutter'}`
  const time = end.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
  const day = end.toDateString() === new Date(now).toDateString() ? 'i dag' : 'i morgen'
  return `Virker i ${left} til (til kl. ${time} ${day}).`
}
