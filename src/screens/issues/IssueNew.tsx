import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Camera, RotateCcw } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { insertRow } from '../../lib/data'
import { compressImage } from '../../lib/files'
import { draftMeta, type Issue } from '../../lib/types'
import { useMe } from '../../lib/useMe'

export function IssueNew() {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const fieldId = useId()
  const camera = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
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
    const draft = draftMeta(cabin.id, me)
    try {
      // Bildet krympes nå og lastes opp sammen med feilmeldingen, også senere hvis det ikke er nett.
      const image = photo ? await compressImage(photo) : null
      await insertRow<Issue>(
        'issues',
        { ...draft, title: title.trim(), description: description.trim() || null, status: 'ny', photo_path: null },
        image ? { file: image, folder: 'issues', field: 'photo_path' } : undefined,
      )
      toast('Feilen er meldt')
      navigate('/feil', { replace: true })
    } catch {
      setBusy(false)
      setFormError('Feilmeldingen ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">Meld feil</h1>
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
        {preview ? (
          <div className="stack">
            <div className="photo">
              <img src={preview} alt="Bildet av feilen" />
            </div>
            <div>
              <button type="button" className="ha-btn ha-btn-ghost" style={{ paddingLeft: 0 }} onClick={() => camera.current?.click()}>
                <RotateCcw className="ha-ico" aria-hidden="true" />
                Ta nytt bilde
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
          {busy ? 'Sender …' : 'Send feilmelding'}
        </button>
      </form>
    </>
  )
}
