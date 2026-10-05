import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Field, PasswordField } from '../../components/Field'
import { NotConfigured } from '../../components/NotConfigured'
import { TopBar } from '../../components/TopBar'
import { authErrorMessage } from '../../lib/authErrors'
import { supabase } from '../../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!email.trim()) {
      setError('Skriv inn e-postadressen din.')
      return
    }
    if (!password) {
      setError('Skriv inn passordet ditt.')
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setError(authErrorMessage(error))
      return
    }
    navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
  }

  return (
    <main className="screen">
      <TopBar backTo="/velkommen" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">Logg inn</h1>
        <NotConfigured />
        <div className="stack-lg">
          <Field
            label="E-postadresse"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(undefined)
            }}
          />
          <div className="stack">
            <PasswordField
              label="Passord"
              autoComplete="current-password"
              value={password}
              error={error}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(undefined)
              }}
            />
            <div>
              <Link className="ha-btn ha-btn-ghost" style={{ paddingLeft: 0 }} to="/glemt-passord" state={{ email }}>
                Glemt passord?
              </Link>
            </div>
          </div>
        </div>
        <div className="stack">
          <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
            {busy ? 'Logger inn …' : 'Logg inn'}
          </button>
          <p className="t-caption center">Du forblir innlogget på denne telefonen.</p>
        </div>
      </form>
    </main>
  )
}
