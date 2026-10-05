import { useId, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../lib/auth'
import { useCurrentCabin } from '../../lib/cabins'
import { byStart, useStayPerson, within } from '../../lib/calendar'
import { addDays, formatRange, todayIso } from '../../lib/dates'
import { deleteRows, insertRow, updateRow, useTable } from '../../lib/data'
import { useMembers, useNames } from '../../lib/members'
import { draftMeta, type Stay } from '../../lib/types'
import { useMe } from '../../lib/useMe'

const OTHER = 'andre'

/** «Jeg er på hytta» og «Endre opphold». */
export function StayForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<Stay>('stays', cabin.id)
  const existing = id ? rows?.find((s) => s.id === id) : undefined

  if (id && !rows) return <TopBar backTo="/mer/kalender" backLabel="Kalender" />
  if (id && !existing) {
    return (
      <>
        <TopBar backTo="/mer/kalender" backLabel="Kalender" />
        <div className="scroll">
          <p className="empty">Oppholdet finnes ikke lenger.</p>
        </div>
      </>
    )
  }
  return <StayFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function StayFormInner({ existing }: { existing?: Stay }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const fieldId = useId()
  const { firstName } = useAuth()
  const { rows: members } = useMembers(cabin.id)
  const { rows: stays } = useTable<Stay>('stays', cabin.id)
  const name = useNames(cabin.id)
  const { who: personOf, tint } = useStayPerson(cabin.id)

  const startDay = /^\d{4}-\d{2}-\d{2}$/.test(params.get('dato') ?? '') ? params.get('dato')! : todayIso()
  // Et medlem (standard: meg), eller OTHER for noen som ikke bruker appen.
  const [who, setWho] = useState(existing ? (existing.user_id ?? OTHER) : me)
  const [guest, setGuest] = useState(existing?.guest_name ?? '')
  const [guestError, setGuestError] = useState<string>()
  const [from, setFrom] = useState(existing?.start_date ?? startDay)
  const [to, setTo] = useState(existing?.end_date ?? addDays(startDay, 2))
  const [note, setNote] = useState(existing?.note ?? '')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const back = `/mer/kalender?dag=${existing?.start_date ?? startDay}`
  const valid = from && to && to >= from
  // Hvem andre er der samtidig? Nyttig å vite før man drar.
  const others = valid ? within(stays, from, to).filter((s) => s.id !== existing?.id && (who === OTHER || s.user_id !== who)).sort(byStart) : []
  const canDelete = !existing || existing.created_by === me || existing.user_id === me || cabin.role === 'admin'

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (who === OTHER && !guest.trim()) {
      setGuestError('Skriv hvem som er på hytta, for eksempel «Mormor».')
      return
    }
    if (!from || !to) {
      setError('Velg både fra- og til-dato.')
      return
    }
    if (to < from) {
      setError('Til-datoen kan ikke være før fra-datoen.')
      return
    }
    const person = who === OTHER ? { user_id: null, guest_name: guest.trim() } : { user_id: who, guest_name: null }
    const fields = { ...person, start_date: from, end_date: to, note: note.trim() || null }
    setBusy(true)
    try {
      if (existing) {
        await updateRow<Stay>('stays', cabin.id, existing.id, fields)
        toast('Oppholdet er endret')
      } else {
        await insertRow<Stay>('stays', { ...draftMeta(cabin.id, me), ...fields })
        toast(who === me ? 'Du står i kalenderen' : `${person.guest_name ?? name(who)} står i kalenderen`)
      }
      navigate(`/mer/kalender?dag=${from}`, { replace: true })
    } catch {
      setBusy(false)
      setFormError('Oppholdet ble ikke lagret. Prøv igjen.')
    }
  }

  async function remove(s: Stay) {
    navigate(back, { replace: true })
    try {
      await deleteRows('stays', cabin.id, [s.id])
      toast('Oppholdet er slettet')
    } catch {
      toast('Oppholdet ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" backTo={back} />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre opphold' : 'På hytta'}</h1>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-who`}>Hvem er på hytta?</label>
          <select
            id={`${fieldId}-who`}
            className="ha-input"
            value={who}
            onChange={(e) => {
              setWho(e.target.value)
              setGuestError(undefined)
            }}
          >
            {/* Meg først, også før medlemslisten er hentet. */}
            {!members?.some((m) => m.user_id === me) && <option value={me}>{firstName ? `${firstName} (meg)` : 'Meg'}</option>}
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_id === me ? `${m.first_name} (meg)` : m.first_name}
              </option>
            ))}
            {/* Opphold for noen som ikke er med lenger, kan fortsatt endres. */}
            {members && who !== OTHER && !members.some((m) => m.user_id === who) && <option value={who}>Tidligere medlem</option>}
            <option value={OTHER}>Noen andre (skriv navn)</option>
          </select>
        </div>
        {who === OTHER && (
          <Field
            label="Navn"
            hint="For eksempel «Mormor» eller «Familien Hansen»."
            value={guest}
            maxLength={60}
            error={guestError}
            autoFocus
            onChange={(e) => {
              setGuest(e.target.value)
              setGuestError(undefined)
            }}
          />
        )}
        <div className="date-pair">
          <div className="ha-field">
            <label htmlFor={`${fieldId}-from`}>Fra</label>
            <input
              id={`${fieldId}-from`}
              className="ha-input"
              type="date"
              value={from}
              onChange={(e) => {
                const v = e.target.value
                // Flytter man starten forbi slutten, følger slutten med.
                if (v && to && v > to) setTo(v)
                setFrom(v)
                setError(undefined)
              }}
            />
          </div>
          <div className="ha-field">
            <label htmlFor={`${fieldId}-to`}>Til</label>
            <input
              id={`${fieldId}-to`}
              className="ha-input"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value)
                setError(undefined)
              }}
            />
          </div>
        </div>
        {error && <FieldError message={error} />}
        <Field
          label="Notat (valgfritt)"
          hint="For eksempel «Med to venner» eller «Kommer sent fredag»."
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
        {others.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            <span className="ha-label">Også på hytta da</span>
            <div className="ha-list">
              {others.map((s) => (
                <div key={s.id} className="ha-li">
                  <span className="cal-dot" style={{ background: tint(s) }} aria-hidden="true" />
                  <span className="ha-li-main">
                    <span className="ha-li-title">{personOf(s)}</span>
                    <span className="ha-li-meta">
                      {formatRange(s.start_date, s.end_date)}
                      {s.note ? ` · ${s.note}` : ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {existing ? 'Lagre endringene' : 'Legg i kalenderen'}
        </button>
        {existing &&
          (canDelete ? (
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
              Slett oppholdet
            </button>
          ) : (
            <p className="t-caption center">
              Bare {deleters(existing.user_id ? name(existing.user_id) : '', name(existing.created_by))} kan slette dette oppholdet.
            </p>
          ))}
      </form>
      {confirming && existing && (
        <ConfirmSheet title="Slette oppholdet?" confirmLabel="Slett oppholdet" onConfirm={() => remove(existing)} onClose={() => setConfirming(false)}>
          {personOf(existing)} på hytta {formatRange(existing.start_date, existing.end_date)} blir borte fra kalenderen.
        </ConfirmSheet>
      )}
    </>
  )
}

/** «Kari og admin», «Kari, Ola og admin». */
function deleters(...names: string[]) {
  const list = [...new Set(names.filter((n) => n && n !== 'Tidligere medlem')), 'admin']
  return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} og ${list[list.length - 1]}`
}
