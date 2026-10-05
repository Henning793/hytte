import { AuthError } from '@supabase/supabase-js'

/** Vennlige feilmeldinger for det som kan gå galt mot Supabase Auth. */
export function authErrorMessage(error: unknown): string {
  if (!navigator.onLine) {
    return 'Du er uten nett. Innlogging trenger nett, så prøv igjen når du har dekning.'
  }
  const code = error instanceof AuthError ? error.code : undefined
  switch (code) {
    case 'invalid_credentials':
      return 'Feil e-post eller passord. Prøv igjen, eller trykk «Glemt passord?».'
    case 'user_already_exists':
    case 'email_exists':
      return 'Det finnes allerede en bruker med denne e-postadressen. Logg inn i stedet, eller trykk «Glemt passord?».'
    case 'weak_password':
      return 'Passordet er for svakt. Bruk minst 8 tegn, gjerne flere ord.'
    case 'same_password':
      return 'Det nye passordet er det samme som det gamle. Velg et annet.'
    case 'email_address_invalid':
      return 'Det ser ikke ut som en e-postadresse. Sjekk at den har med @ og punktum.'
    case 'email_not_confirmed':
      return 'Du må bekrefte e-postadressen først. Sjekk innboksen din.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Du har prøvd mange ganger på kort tid. Vent noen minutter og prøv igjen.'
    default:
      return 'Noe gikk galt. Prøv igjen om litt.'
  }
}
