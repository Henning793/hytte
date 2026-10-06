import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Camera, RotateCcw, Trash2 } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { insertRow, updateRow, useTable } from '../../lib/data'
import { compressImage, removeFile, useFileUrl } from '../../lib/files'
import { useMembers } from '../../lib/members'
import { draftMeta, type Task, type TaskKind } from '../../lib/types'
import { useMe } from '../../lib/useMe'

/** «Ny oppgave», «Meld feil» og «Endre oppgave». */
export function TaskForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<Task>('tasks', cabin.id)
  const existing = id ? rows?.find((t) => t.id === id) : undefined

  if (id && !rows) return <TopBar backTo="/oppgaver" backLabel="Oppgaver" />
  if (id && !existing) {
    return (
      <>
        <TopBar backTo="/oppgaver" backLabel="Oppgaver" />
        <div className="scroll">
          <p className="empty">Oppgaven finnes ikke lenger.</p>
        </div>
      </>
    )
  }
  // key: skjemaet starter på nytt med riktige verdier når oppgaven er lastet.
  return <TaskFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function TaskFormInner({ existing }: { existing?: Task }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  const { rows: members } = useMembers(cabin.id)
  const fieldId = useId()
  const camera = useRef<HTMLInputElement>(null)

  const state = location.state as { kind?: TaskKind } | null
  const [kind, setKind] = useState<TaskKind>(existing?.kind ?? state?.kind ?? 'oppgave')
  const [photo, setPhoto] = useState<File | null>(null)
  // Bildet som er lagret fra før; null når det er fjernet i skjemaet.
  const [keptPhoto, setKeptPhoto] = useState(existing?.photo_path ?? null)
  const keptUrl = useFileUrl(photo ? null : keptPhoto)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [responsible, setResponsible] = useState(existing?.responsible_user_id ?? '')
  const [due, setDue] = useState(existing?.due_date ?? '')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const fault = kind === 'feil'

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!title.trim()) {
      setError(fault ? 'Skriv kort hva som er feil, for eksempel «Lekker under vasken».' : 'Skriv kort hva som skal gjøres.')
      return
    }
    const fields = {
      kind,
      title: title.trim(),
      description: description.trim() || null,
      responsible_user_id: responsible || null,
      due_date: due || null,
    }
    setBusy(true)
    setFormError(undefined)
    try {
      // Bildet krympes nå og lastes opp sammen med oppgaven, også senere hvis det ikke er nett.
      const image = photo ? await compressImage(photo) : null
      const upload = image ? { file: image, folder: 'tasks', field: 'photo_path' as const } : undefined
      if (existing) {
        const old = existing.photo_path
        const photoChanged = !!image || keptPhoto !== old
        await updateRow<Task>('tasks', cabin.id, existing.id, photoChanged && !image ? { ...fields, photo_path: null } : fields, {}, upload)
        // Det gamle bildet trengs ikke lenger (bilder som ikke er lastet opp ennå, har ingen fil).
        if (photoChanged && old && !old.startsWith('local:')) void removeFile(old)
        toast('Oppgaven er endret')
        navigate(`/oppgaver/${existing.id}`, { replace: true })
      } else {
        await insertRow<Task>(
          'tasks',
          { ...draftMeta(cabin.id, me), ...fields, photo_path: null, done: false, done_by: null, done_at: null },
          upload,
        )
        toast(fault ? 'Feilen er meldt' : 'Oppgaven er lagt til')
        navigate('/oppgaver', { replace: true })
      }
    } catch {
      setBusy(false)
      setFormError('Oppgaven ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre oppgave' : fault ? 'Meld feil' : 'Ny oppgave'}</h1>
        <Segmented<TaskKind>
          label="Hva gjelder det?"
          value={kind}
          options={[
            { value: 'feil', label: 'Noe er ødelagt' },
            { value: 'oppgave', label: 'Noe må gjøres' },
          ]}
          onChange={setKind}
        />
        {/* capture åpner kameraet direkte på iPhone og Android. */}
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPhoto(file)
            e.target.value = ''
          }}
        />
        {preview || keptPhoto ? (
          <div className="stack">
            <div className="photo">
              {preview || keptUrl ? <img src={preview ?? keptUrl ?? ''} alt="Bildet som hører til oppgaven" /> : <div style={{ height: 200 }} />}
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="ha-btn ha-btn-ghost" style={{ paddingLeft: 0 }} onClick={() => camera.current?.click()}>
                <RotateCcw className="ha-ico" aria-hidden="true" />
                Ta nytt bilde
              </button>
              <button
                type="button"
                className="ha-btn ha-btn-ghost"
                onClick={() => {
                  setPhoto(null)
                  setKeptPhoto(null)
                }}
              >
                <Trash2 className="ha-ico" aria-hidden="true" />
                Fjern bildet
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="photo-slot" onClick={() => camera.current?.click()}>
            <Camera className="ha-ico" aria-hidden="true" />
            Ta bilde
            <span className="t-caption" style={{ fontWeight: 400 }}>
              Valgfritt, men hjelper de andre
            </span>
          </button>
        )}
        <Field
          label={fault ? 'Hva er feil?' : 'Hva skal gjøres?'}
          value={title}
          maxLength={200}
          error={error}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(undefined)
          }}
        />
        <div className="ha-field">
          <label htmlFor={`${fieldId}-desc`}>
            Beskrivelse <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <textarea
            id={`${fieldId}-desc`}
            className="ha-input"
            aria-describedby={fault ? `${fieldId}-hint` : undefined}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {fault && (
            <span className="ha-hint" id={`${fieldId}-hint`}>
              Hvor er det, og hva har du gjort så langt?
            </span>
          )}
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-resp`}>
            Ansvarlig <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <select
            id={`${fieldId}-resp`}
            className="ha-input"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          >
            <option value="">Ingen ennå</option>
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_id === me ? `${m.first_name} (meg)` : m.first_name}
              </option>
            ))}
          </select>
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-due`}>
            Frist <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <input
            id={`${fieldId}-due`}
            className="ha-input"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? 'Lagrer …' : existing ? 'Lagre endringene' : fault ? 'Send feilmelding' : 'Lagre oppgave'}
        </button>
      </form>
    </>
  )
}
