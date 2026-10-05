import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { MailCheck } from 'lucide-react'
import { Field } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { authErrorMessage } from '../../lib/authErrors'
import { supabase } from '../../lib/supabase'

const EMAIL = /^\S+@\S+\.\S+$/

export function ForgotPassword() {
  const location = useLocation()
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string>()

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const address = email.trim()
    if (!EMAIL.test(address)) {
      setError('Det ser ikke ut som en e-postadresse. Sjekk at den har med @ og punktum.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/nytt-passord`,
    })
    setBusy(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    setSentTo(address)
  }

  return (
    <main className="screen">
      <TopBar backTo="/logg-inn" />
      {sentTo ? (
        <div className="scroll">
          <div className="done-card" role="status">
            <MailCheck className="ha-ico" aria-hidden="true" />
            <div className="stack" style={{ gap: 4 }}>
              <strong>Sjekk e-posten din</strong>
              <span>
                Vi har sendt en lenke til {sentTo}. Lenken virker i én time. Finner du den ikke, se i søppelposten.
              </span>
            </div>
          </div>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/logg-inn">
            Tilbake til innlogging
          </Link>
        </div>
      ) : (
        <form className="scroll" onSubmit={submit} noValidate>
          <div className="stack">
            <h1 className="t-title">Glemt passord</h1>
            <p className="muted">Skriv e-postadressen din, så sender vi deg en lenke for å lage nytt passord.</p>
          </div>
          <Field
            label="E-postadresse"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            error={error}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(undefined)
            }}
          />
          <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
            {busy ? 'Sender …' : 'Send lenke'}
          </button>
        </form>
      )}
    </main>
  )
}
