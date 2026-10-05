import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Field, FieldError, PasswordField } from '../../components/Field'
import { NotConfigured } from '../../components/NotConfigured'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { authErrorMessage } from '../../lib/authErrors'
import { supabase } from '../../lib/supabase'

type Errors = { name?: string; email?: string; pw1?: string; pw2?: string; form?: string }

const EMAIL = /^\S+@\S+\.\S+$/

export function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  // Feilmeldingen forsvinner så snart feltet er rettet.
  function clear(field: keyof Errors) {
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }))
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const next: Errors = {}
    if (!name.trim()) next.name = 'Skriv fornavnet ditt, så de andre ser hvem som har gjort hva.'
    if (!EMAIL.test(email.trim())) next.email = 'Det ser ikke ut som en e-postadresse. Sjekk at den har med @ og punktum.'
    if (pw1.length < 8) next.pw1 = 'Passordet må ha minst 8 tegn.'
    else if (pw1 !== pw2) next.pw2 = 'Passordene er ikke like. Skriv det samme passordet i begge feltene.'
    setErrors(next)
    if (Object.keys(next).length) return

    const firstName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1)
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw1,
      options: { data: { first_name: firstName }, emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) {
      setErrors({ form: authErrorMessage(error) })
      return
    }
    if (!data.session) {
      // E-postbekreftelse er slått på i Supabase.
      setCheckEmail(true)
      return
    }
    toast(`Velkommen, ${firstName}!`)
    navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
  }

  if (checkEmail) {
    return (
      <main className="screen">
        <TopBar backTo="/velkommen" />
        <div className="scroll">
          <h1 className="t-title">Sjekk e-posten din</h1>
          <p className="t-body-lg">
            Vi har sendt en lenke til {email.trim()}. Trykk på den for å bekrefte e-postadressen, så kan du logge inn.
          </p>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/logg-inn" state={location.state}>
            Til innlogging
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <TopBar backTo="/velkommen" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">Opprett bruker</h1>
        <NotConfigured />
        <div className="stack-lg">
          <Field
            label="Fornavn"
            hint="Vises når du krysser av eller melder noe"
            autoComplete="given-name"
            autoCapitalize="words"
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value)
              clear('name')
            }}
          />
          <Field
            label="E-postadresse"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            error={errors.email}
            onChange={(e) => {
              setEmail(e.target.value)
              clear('email')
            }}
          />
          <PasswordField
            label="Passord"
            hint="Minst 8 tegn"
            autoComplete="new-password"
            value={pw1}
            error={errors.pw1}
            onChange={(e) => {
              setPw1(e.target.value)
              clear('pw1')
              if (e.target.value === pw2) clear('pw2')
            }}
          />
          <PasswordField
            label="Gjenta passord"
            autoComplete="new-password"
            value={pw2}
            error={errors.pw2}
            onChange={(e) => {
              setPw2(e.target.value)
              if (e.target.value === pw1) clear('pw2')
            }}
          />
        </div>
        {errors.form && <FieldError message={errors.form} />}
        <div className="stack">
          <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
            {busy ? 'Oppretter bruker …' : 'Opprett bruker'}
          </button>
          <Link className="ha-btn ha-btn-ghost" to="/logg-inn" state={location.state}>
            Har du bruker? Logg inn
          </Link>
        </div>
      </form>
    </main>
  )
}
