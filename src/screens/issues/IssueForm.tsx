import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Camera, RotateCcw, Trash2 } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { insertRow, updateRow, useTable } from '../../lib/data'
import { compressImage, removeFile, useFileUrl } from '../../lib/files'
import { draftMeta, type Issue } from '../../lib/types'
import { useMe } from '../../lib/useMe'

/** «Meld feil» og «Endre feilmelding». */
export function IssueForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<Issue>('issues', cabin.id)
  const existing = id ? rows?.find((i) => i.id === id) : undefined

  if (id && !rows) return <TopBar backTo="/feil" backLabel="Feil og mangler" />
  if (id && !existing) {
    return (
      <>
        <TopBar backTo="/feil" backLabel="Feil og mangler" />
        <div className="scroll">
          <p className="empty">Feilmeldingen finnes ikke lenger.</p>
        </div>
      </>
    )
  }
  // key: skjemaet starter på nytt med riktige verdier når feilmeldingen er lastet.
  return <IssueFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function IssueFormInner({ existing }: { existing?: Issue }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const fieldId = useId()
  const camera = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  // Bildet som er lagret fra før; null når det er fjernet i skjemaet.
  const [keptPhoto, setKeptPhoto] = useState(existing?.photo_path ?? null)
  const keptUrl = useFileUrl(photo ? null : keptPhoto)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!title.trim()) {
      setError('Skriv kort hva som er feil, for eksempel «Lekker under vasken».')
      return
    }
    setBusy(true)
    setFormError(undefined)
    const fields = { title: title.trim(), description: description.trim() || null }
    try {
      // Bildet krympes nå og lastes opp sammen med feilmeldingen, også senere hvis det ikke er nett.
      const image = photo ? await compressImage(photo) : null
      const upload = image ? { file: image, folder: 'issues', field: 'photo_path' as const } : undefined
      if (existing) {
        const old = existing.photo_path
        const photoChanged = !!image || keptPhoto !== old
        await updateRow<Issue>('issues', cabin.id, existing.id, photoChanged && !image ? { ...fields, photo_path: null } : fields, {}, upload)
        // Det gamle bildet trengs ikke lenger (bilder som ikke er lastet opp ennå, har ingen fil).
        if (photoChanged && old && !old.startsWith('local:')) void removeFile(old)
        toast('Feilmeldingen er endret')
        navigate(`/feil/${existing.id}`, { replace: true })
      } else {
        await insertRow<Issue>('issues', { ...draftMeta(cabin.id, me), ...fields, status: 'ny', photo_path: null }, upload)
        toast('Feilen er meldt')
        navigate('/feil', { replace: true })
      }
    } catch {
      setBusy(false)
      setFormError('Feilmeldingen ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre feilmelding' : 'Meld feil'}</h1>
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
              {preview || keptUrl ? <img src={preview ?? keptUrl ?? ''} alt="Bildet av feilen" /> : <div style={{ height: 200 }} />}
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
          label="Hva er feil?"
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
            aria-describedby={`${fieldId}-hint`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="ha-hint" id={`${fieldId}-hint`}>
            Hvor er det, og hva har du gjort så langt?
          </span>
        </div>
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? (existing ? 'Lagrer …' : 'Sender …') : existing ? 'Lagre endringene' : 'Send feilmelding'}
        </button>
      </form>
    </>
  )
}
