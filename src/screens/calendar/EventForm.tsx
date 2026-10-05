import { useId, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { onlyDeleter } from '../../lib/content'
import { todayIso } from '../../lib/dates'
import { deleteRows, insertRow, updateRow, useTable } from '../../lib/data'
import { useNames } from '../../lib/members'
import { draftMeta, type CalendarEvent } from '../../lib/types'
import { useMe } from '../../lib/useMe'

/** «Ny hendelse» og «Endre hendelse» (dugnad, ferier, utleie …). */
export function EventForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<CalendarEvent>('calendar_events', cabin.id)
  const existing = id ? rows?.find((e) => e.id === id) : undefined

  if (id && !rows) return <TopBar backTo="/mer/kalender" backLabel="Kalender" />
  if (id && !existing) {
    return (
      <>
        <TopBar backTo="/mer/kalender" backLabel="Kalender" />
        <div className="scroll">
          <p className="empty">Hendelsen finnes ikke lenger.</p>
        </div>
      </>
    )
  }
  return <EventFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function EventFormInner({ existing }: { existing?: CalendarEvent }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const fieldId = useId()
  const name = useNames(cabin.id)

  const startDay = /^\d{4}-\d{2}-\d{2}$/.test(params.get('dato') ?? '') ? params.get('dato')! : todayIso()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [from, setFrom] = useState(existing?.start_date ?? startDay)
  const [to, setTo] = useState(existing?.end_date ?? startDay)
  const [time, setTime] = useState(existing?.start_time?.slice(0, 5) ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [titleError, setTitleError] = useState<string>()
  const [dateError, setDateError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const back = `/mer/kalender?dag=${existing?.start_date ?? startDay}`
  const canDelete = existing && (existing.created_by === me || cabin.role === 'admin')

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    let ok = true
    if (!title.trim()) {
      setTitleError('Skriv hva som skjer, for eksempel «Dugnad».')
      ok = false
    }
    if (!from || !to) {
      setDateError('Velg dato.')
      ok = false
    } else if (to < from) {
      setDateError('Til-datoen kan ikke være før fra-datoen.')
      ok = false
    }
    if (!ok) return
    const fields = {
      title: title.trim(),
      start_date: from,
      end_date: to,
      start_time: time ? `${time}:00` : null,
      description: description.trim() || null,
    }
    setBusy(true)
    try {
      if (existing) {
        await updateRow<CalendarEvent>('calendar_events', cabin.id, existing.id, fields)
        toast('Hendelsen er endret')
      } else {
        await insertRow<CalendarEvent>('calendar_events', { ...draftMeta(cabin.id, me), ...fields })
        toast('Hendelsen er lagt til')
      }
      navigate(`/mer/kalender?dag=${from}`, { replace: true })
    } catch {
      setBusy(false)
      setFormError('Hendelsen ble ikke lagret. Prøv igjen.')
    }
  }

  async function remove(e: CalendarEvent) {
    navigate(back, { replace: true })
    try {
      await deleteRows('calendar_events', cabin.id, [e.id])
      toast('Hendelsen er slettet')
    } catch {
      toast('Hendelsen ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" backTo={back} />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre hendelse' : 'Ny hendelse'}</h1>
        <Field
          label="Hva skjer?"
          hint="Dugnad, høstferie, hytta er utleid …"
          value={title}
          maxLength={200}
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleError(undefined)
          }}
        />
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
                // Endagshendelser: slutten følger starten.
                if (v && (to === from || (to && v > to))) setTo(v)
                setFrom(v)
                setDateError(undefined)
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
                setDateError(undefined)
              }}
            />
          </div>
        </div>
        {dateError && <FieldError message={dateError} />}
        <div className="ha-field">
          <label htmlFor={`${fieldId}-time`}>
            Klokkeslett <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <input id={`${fieldId}-time`} className="ha-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-desc`}>
            Beskrivelse <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <textarea id={`${fieldId}-desc`} className="ha-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {existing && (
          <p className="t-caption">
            Lagt til av {name(existing.created_by)}. Alle kan endre hendelsen.
          </p>
        )}
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {existing ? 'Lagre endringene' : 'Legg i kalenderen'}
        </button>
        {existing &&
          (canDelete ? (
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
              Slett hendelsen
            </button>
          ) : (
            <p className="t-caption center">Bare {onlyDeleter(name(existing.created_by))} kan slette denne hendelsen.</p>
          ))}
      </form>
      {confirming && existing && (
        <ConfirmSheet title="Slette hendelsen?" confirmLabel="Slett hendelsen" onConfirm={() => remove(existing)} onClose={() => setConfirming(false)}>
          «{existing.title}» blir borte fra kalenderen for alle.
        </ConfirmSheet>
      )}
    </>
  )
}
