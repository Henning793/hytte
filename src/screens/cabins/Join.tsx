import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FileText, ListChecks, ShoppingCart } from 'lucide-react'
import { CabinAvatar } from '../../components/CabinAvatar'
import { FieldError } from '../../components/Field'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth'
import { useCabins } from '../../lib/cabins'
import { forgetInvite, rememberInvite } from '../../lib/invite'
import { supabase } from '../../lib/supabase'

type Preview = {
  cabin_id: string
  cabin_name: string
  invited_by: string | null
  member_count: number
  already_member: boolean
}

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'offline' }
  | { kind: 'ready'; preview: Preview }

function Benefits() {
  return (
    <div className="ha-card">
      <div className="row">
        <ListChecks className="ha-ico" aria-hidden="true" />
        <span>Se og legg til oppgaver og feil</span>
      </div>
      <div className="row">
        <ShoppingCart className="ha-ico" aria-hidden="true" />
        <span>Felles handleliste og sjekklister</span>
      </div>
      <div className="row">
        <FileText className="ha-ico" aria-hidden="true" />
        <span>Wifi, koder og manualer</span>
      </div>
    </div>
  )
}

/** «Bli med i [hyttenavn]», åpnet fra invitasjonslenken. */
export function Join() {
  const { token = '' } = useParams()
  const { session, loading: authLoading } = useAuth()

  // Husk koden, så brukeren kommer tilbake hit etter registrering eller innlogging.
  useEffect(() => {
    if (token) rememberInvite(token)
  }, [token])

  if (authLoading) return null
  return session ? <JoinLoggedIn token={token} /> : <JoinLoggedOut token={token} />
}

function JoinLoggedOut({ token }: { token: string }) {
  const from = { from: `/bli-med/${token}` }
  return (
    <main className="screen">
      <div className="scroll" style={{ paddingTop: 40, justifyContent: 'space-between' }}>
        <div className="stack-lg">
          <h1 className="t-display">Du er invitert til en hytte</h1>
          <p className="t-body-lg muted">Opprett bruker eller logg inn, så kan du bli med med ett trykk.</p>
          <Benefits />
        </div>
        <div className="stack">
          <Link className="ha-btn ha-btn-primary ha-btn-block" to="/opprett-bruker" state={from}>
            Opprett bruker og bli med
          </Link>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/logg-inn" state={from}>
            Jeg har bruker – logg inn
          </Link>
        </div>
      </div>
    </main>
  )
}

function JoinLoggedIn({ token }: { token: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh, select, cabins } = useCabins()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let active = true
    supabase.rpc('invite_preview', { p_token: token }).then(({ data, error }) => {
      if (!active) return
      if (error && !navigator.onLine) {
        setState({ kind: 'offline' })
      } else if (error || !data || data.length === 0) {
        // Ugyldig kode: ikke send brukeren hit igjen etter innlogging.
        forgetInvite()
        setState({ kind: 'invalid' })
      } else {
        setState({ kind: 'ready', preview: data[0] as Preview })
      }
    })
    return () => {
      active = false
    }
  }, [token])

  function leave() {
    forgetInvite()
    navigate(cabins.length ? '/' : '/ingen-hytte', { replace: true })
  }

  async function join(preview: Preview) {
    setBusy(true)
    setError(undefined)
    const { error } = await supabase.rpc('join_cabin', { p_token: token })
    if (error) {
      setBusy(false)
      setError(
        error.hint === 'invalid_token'
          ? 'Invitasjonslenken er utløpt. Be den som inviterte deg om en ny lenke.'
          : 'Noe gikk galt. Sjekk at du har nett, og prøv igjen.',
      )
      return
    }
    forgetInvite()
    await refresh()
    select(preview.cabin_id)
    toast(`Du er nå med i ${preview.cabin_name}`)
    navigate('/', { replace: true })
  }

  if (state.kind === 'loading') return null

  if (state.kind !== 'ready') {
    return (
      <main className="screen">
        <div className="scroll" style={{ paddingTop: 40, justifyContent: 'space-between' }}>
          <div className="stack-lg">
            <h1 className="t-title">{state.kind === 'offline' ? 'Du er uten nett' : 'Lenken virker ikke'}</h1>
            <p className="t-body-lg">
              {state.kind === 'offline'
                ? 'Å bli med i en hytte trenger nett. Åpne lenken igjen når du har dekning.'
                : 'Invitasjonslenken er utløpt. Be den som inviterte deg om en ny lenke.'}
            </p>
          </div>
          <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={leave}>
            {cabins.length ? 'Til hytta' : 'Tilbake'}
          </button>
        </div>
      </main>
    )
  }

  const { preview } = state
  const others = preview.member_count === 1 ? '1 er med fra før.' : `${preview.member_count} er med fra før.`

  if (preview.already_member) {
    return (
      <main className="screen">
        <div className="scroll" style={{ paddingTop: 40, justifyContent: 'space-between' }}>
          <div className="stack-lg">
            <CabinAvatar name={preview.cabin_name} alt size={72} />
            <h1 className="t-display">Du er allerede med i {preview.cabin_name}</h1>
          </div>
          <button
            type="button"
            className="ha-btn ha-btn-primary ha-btn-block"
            onClick={() => {
              forgetInvite()
              select(preview.cabin_id)
              navigate('/', { replace: true })
            }}
          >
            Gå til {preview.cabin_name}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="scroll" style={{ paddingTop: 40, justifyContent: 'space-between' }}>
        <div className="stack-lg">
          <CabinAvatar name={preview.cabin_name} alt size={72} />
          <h1 className="t-display">Bli med i {preview.cabin_name}</h1>
          <p className="t-body-lg muted">
            {preview.invited_by ? `${preview.invited_by} har invitert deg. ` : ''}
            {others}
          </p>
          <Benefits />
        </div>
        <div className="stack">
          {error && <FieldError message={error} />}
          <button type="button" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy} onClick={() => join(preview)}>
            {busy ? 'Blir med …' : `Bli med i ${preview.cabin_name}`}
          </button>
          <button type="button" className="ha-btn ha-btn-ghost" onClick={leave}>
            Ikke nå
          </button>
        </div>
      </div>
    </main>
  )
}
