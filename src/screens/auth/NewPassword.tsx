import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { FieldError, PasswordField } from '../../components/Field'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth'
import { authErrorMessage } from '../../lib/authErrors'
import { supabase } from '../../lib/supabase'

type Errors = { pw1?: string; pw2?: string; form?: string }

/** Hit kommer man fra lenken i «Glemt passord»-e-posten. */
export function NewPassword() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)

  if (loading) return null

  if (!session) {
    return (
      <main className="screen">
        <div className="scroll" style={{ paddingTop: 40 }}>
          <h1 className="t-title">Lenken virker ikke</h1>
          <p className="t-body-lg">Lenken er brukt eller utløpt. Be om en ny, så får du den på e-post.</p>
          <Link className="ha-btn ha-btn-primary ha-btn-block" to="/glemt-passord">
            Send ny lenke
          </Link>
        </div>
      </main>
    )
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const next: Errors = {}
    if (pw1.length < 8) next.pw1 = 'Passordet må ha minst 8 tegn.'
    else if (pw1 !== pw2) next.pw2 = 'Passordene er ikke like. Skriv det samme passordet i begge feltene.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setBusy(false)
    if (error) {
      setErrors({ form: authErrorMessage(error) })
      return
    }
    toast('Passordet er endret')
    navigate('/', { replace: true })
  }

  return (
    <main className="screen">
      <form className="scroll" onSubmit={submit} noValidate style={{ paddingTop: 40 }}>
        <div className="stack">
          <h1 className="t-title">Lag nytt passord</h1>
          <p className="muted">Etterpå er du innlogget med det nye passordet.</p>
        </div>
        <div className="stack-lg">
          <PasswordField
            label="Nytt passord"
            hint="Minst 8 tegn"
            autoComplete="new-password"
            value={pw1}
            error={errors.pw1}
            onChange={(e) => {
              const value = e.target.value
              setPw1(value)
              setErrors((x) => ({ ...x, pw1: undefined, form: undefined, pw2: value === pw2 ? undefined : x.pw2 }))
            }}
          />
          <PasswordField
            label="Gjenta passord"
            autoComplete="new-password"
            value={pw2}
            error={errors.pw2}
            onChange={(e) => {
              setPw2(e.target.value)
              if (e.target.value === pw1) setErrors((x) => ({ ...x, pw2: undefined }))
            }}
          />
        </div>
        {errors.form && <FieldError message={errors.form} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? 'Lagrer …' : 'Lagre nytt passord'}
        </button>
      </form>
    </main>
  )
}
