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
