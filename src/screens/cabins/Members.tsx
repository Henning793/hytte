import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Copy, MessageSquare, Trash2, UserPlus } from 'lucide-react'
import { PersonAvatar } from '../../components/CabinAvatar'
import { Field, FieldError } from '../../components/Field'
import { Sheet } from '../../components/Sheet'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth'
import { useCabins, useCurrentCabin } from '../../lib/cabins'
import { reload } from '../../lib/data'
import { deleteCabin } from '../../lib/deleteCabin'
import { membersKey, useMembers, type Member } from '../../lib/members'
import { inviteLink } from '../../lib/invite'
import { supabase } from '../../lib/supabase'

export function Members() {
  const cabin = useCurrentCabin()
  const { refresh } = useCabins()
  const { session } = useAuth()
  const toast = useToast()
  const me = session?.user.id
  const isAdmin = cabin.role === 'admin'
  const { rows: members, failed } = useMembers(cabin.id)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)
  const closeInvite = useCallback(() => setInviteOpen(false), [])
  const closeRemove = useCallback(() => setRemoving(null), [])
  const [deleting, setDeleting] = useState(false)
  const closeDelete = useCallback(() => setDeleting(false), [])

  const admins = members?.filter((m) => m.role === 'admin').map((m) => m.first_name) ?? []
  const count = members?.length ?? cabin.member_count

  async function remove(member: Member) {
    const { error } = await supabase
      .from('cabin_members')
      .delete()
      .eq('cabin_id', cabin.id)
      .eq('user_id', member.user_id)
    setRemoving(null)
    if (error) {
      toast(`${member.first_name} ble ikke fjernet. Sjekk at du har nett.`)
      return
    }
    toast(`${member.first_name} er fjernet fra ${cabin.name}`)
    reload(membersKey(cabin.id))
    await refresh()
  }

  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="t-title">Medlemmer</h1>
          <p className="t-caption">
            {count === 1 ? '1 medlem' : `${count} medlemmer`} i {cabin.name}
          </p>
        </div>

        {isAdmin ? (
          <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={() => setInviteOpen(true)}>
            <UserPlus className="ha-ico" aria-hidden="true" />
            Inviter
          </button>
        ) : (
          admins.length > 0 && (
            <p className="muted">Bare {admins.join(' og ')} (admin) kan invitere og fjerne medlemmer.</p>
          )
        )}

        {failed && !members && <FieldError message="Fikk ikke hentet medlemmene. Sjekk at du har nett." />}

        {members && (
          <div className="ha-list">
            {members.map((m) => (
              <div key={m.user_id} className="ha-li">
                <PersonAvatar name={m.first_name} />
                <span className="ha-li-main">
                  <span className="ha-li-title">{m.user_id === me ? `${m.first_name} (deg)` : m.first_name}</span>
                  <span className="ha-li-meta">{m.role === 'admin' ? 'Admin' : 'Medlem'}</span>
                </span>
                {isAdmin && m.user_id !== me && (
                  <button
                    type="button"
                    className="mini-btn"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    aria-label={`Fjern ${m.first_name}`}
                    onClick={() => setRemoving(m)}
                  >
                    Fjern
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="stack">
            <h2 className="list-h">Slette hytta</h2>
            <p className="t-caption">
              Sletter {cabin.name} for alle medlemmene, med gjøremål, feil, handleliste, dokumenter, kalender og
              historikk.
            </p>
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setDeleting(true)}>
              <Trash2 className="ha-ico" aria-hidden="true" />
              Slett hytta
            </button>
          </div>
        )}
      </div>

      {deleting && <DeleteCabinSheet onClose={closeDelete} />}

      {inviteOpen &&<InviteSheet cabinId={cabin.id} cabinName={cabin.name} onClose={closeInvite} />}

      {removing && (
        <Sheet label="Fjern medlem" onClose={closeRemove}>
          <div className="stack" style={{ gap: 4 }}>
            <h2 className="t-heading">
              Fjerne {removing.first_name} fra {cabin.name}?
            </h2>
            <p className="muted">
              {removing.first_name} mister tilgangen til hytta med en gang. Det {removing.first_name} har lagt inn, blir
              liggende.
            </p>
          </div>
          <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => remove(removing)}>
            Fjern {removing.first_name}
          </button>
          <button type="button" className="ha-btn ha-btn-ghost" onClick={closeRemove}>
            Avbryt
          </button>
        </Sheet>
      )}
    </>
  )
}

function InviteSheet({ cabinId, cabinName, onClose }: { cabinId: string; cabinName: string; onClose: () => void }) {
  const toast = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('cabin_invites')
      .select('token')
      .eq('cabin_id', cabinId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setFailed(true)
        else setToken(data.token)
      })
  }, [cabinId])

  const link = token ? inviteLink(token) : null
  const message = link ? `Bli med i ${cabinName} i Hytteappen: ${link}` : ''

  async function share() {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bli med i ${cabinName}`, text: `Bli med i ${cabinName} i Hytteappen:`, url: link })
      } catch {
        // Brukeren lukket delingsarket.
      }
      return
    }
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast('Lenken er kopiert')
    } catch {
      toast('Fikk ikke kopiert. Trykk lenge på lenken for å kopiere den.')
    }
  }

  async function renew() {
    setBusy(true)
    const { data, error } = await supabase.rpc('new_invite_link', { p_cabin_id: cabinId })
    setBusy(false)
    if (error || !data) {
      toast('Fikk ikke laget ny lenke. Sjekk at du har nett.')
      return
    }
    setToken(data as string)
    toast('Ny lenke laget. Den gamle virker ikke lenger.')
  }

  return (
    <Sheet label="Inviter til hytta" onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="t-heading">Inviter til {cabinName}</h2>
        <p className="muted">Alle som har lenken kan bli med. Send den på SMS til dem du vil invitere.</p>
      </div>
      {failed ? (
        <FieldError message="Fikk ikke hentet lenken. Sjekk at du har nett." />
      ) : (
        <div className="link-box">{link ?? 'Henter lenke …'}</div>
      )}
      <button type="button" className="ha-btn ha-btn-primary ha-btn-block" disabled={!link} onClick={share}>
        <MessageSquare className="ha-ico" aria-hidden="true" />
        Del på SMS
      </button>
      <div className="row">
        <button type="button" className="ha-btn ha-btn-secondary grow" disabled={!link} onClick={copy}>
          <Copy className="ha-ico" aria-hidden="true" />
          Kopier
        </button>
        <button type="button" className="ha-btn ha-btn-secondary grow" disabled={busy} onClick={renew}>
          Lag ny lenke
        </button>
      </div>
      <p className="t-caption">«Lag ny lenke» gjør den gamle ugyldig.</p>
    </Sheet>
  )
}

/** «Er du sikker?» før hytta slettes. Navnet må skrives inn for å bekrefte. */
function DeleteCabinSheet({ onClose }: { onClose: () => void }) {
  const cabin = useCurrentCabin()
  const { refresh, select } = useCabins()
  const navigate = useNavigate()
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const matches = typed.trim().toLocaleLowerCase('nb') === cabin.name.trim().toLocaleLowerCase('nb')

  async function confirm() {
    if (!matches || busy) return
    if (!navigator.onLine) {
      setError('Du må ha nett for å slette hytta.')
      return
    }
    setBusy(true)
    setError(null)
    const name = cabin.name
    try {
      await deleteCabin(cabin.id)
    } catch {
      setBusy(false)
      setError('Hytta ble ikke slettet. Sjekk at du har nett, og prøv igjen.')
      return
    }
    const rest = (await refresh()).filter((c) => c.id !== cabin.id)
    if (rest[0]) select(rest[0].id)
    toast(`${name} er slettet`)
    navigate('/', { replace: true })
  }

  return (
    <Sheet label="Slett hytta" onClose={busy ? () => {} : onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="t-heading">Slette {cabin.name}?</h2>
        <p className="muted">
          Hytta forsvinner for alle medlemmene, med alt som er lagt inn: gjøremål, feil, handleliste, dokumenter,
          bilder, info og koder, kalender og historikk. Det kan ikke angres.
        </p>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          void confirm()
        }}
      >
        <Field
          label={`Skriv «${cabin.name}» for å bekrefte`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
        />
        {error && <FieldError message={error} />}
        <button type="submit" className="ha-btn ha-btn-danger ha-btn-block" disabled={!matches || busy}>
          {busy ? 'Sletter …' : 'Slett hytta for alle'}
        </button>
      </form>
      <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose} disabled={busy}>
        Avbryt
      </button>
    </Sheet>
  )
}
