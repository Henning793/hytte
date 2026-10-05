import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { todayIso } from '../../lib/dates'
import { insertRow, updateRow, useTable } from '../../lib/data'
import { compressImage } from '../../lib/files'
import { draftMeta, type HistoryEntry } from '../../lib/types'
import { useMe } from '../../lib/useMe'

/** «Legg til i historikken» og «Endre». */
export function HistoryForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<HistoryEntry>('history_entries', cabin.id)
  const existing = id ? rows?.find((e) => e.id === id) : undefined

  if (id && !rows) return <TopBar backTo="/mer/historikk" backLabel="Historikk" />
  if (id && !existing) {
    return (
      <>
        <TopBar backTo="/mer/historikk" backLabel="Historikk" />
        <div className="scroll">
          <p className="empty">Oppføringen finnes ikke lenger.</p>
        </div>
      </>
    )
  }
  return <HistoryFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function HistoryFormInner({ existing }: { existing?: HistoryEntry }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const fieldId = useId()
  const picker = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(existing?.happened_on ?? todayIso())
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [titleError, setTitleError] = useState<string>()
  const [dateError, setDateError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    let ok = true
    if (!title.trim()) {
      setTitleError('Skriv hva som ble gjort, for eksempel «Malte hytta».')
      ok = false
    }
    if (!date) {
      setDateError('Velg når det ble gjort.')
      ok = false
    }
    if (!ok) return
    const fields = { happened_on: date, title: title.trim(), description: description.trim() || null }
    setBusy(true)
    setFormError(undefined)
    try {
      if (existing) {
        await updateRow<HistoryEntry>('history_entries', cabin.id, existing.id, fields)
        toast('Oppføringen er endret')
        navigate(`/mer/historikk/${existing.id}`, { replace: true })
      } else {
        // Bildet krympes nå og lastes opp sammen med oppføringen, også senere hvis det ikke er nett.
        const image = photo ? await compressImage(photo) : null
        await insertRow<HistoryEntry>(
          'history_entries',
          { ...draftMeta(cabin.id, me), ...fields, photo_path: null },
          image ? { file: image, folder: 'history', field: 'photo_path' } : undefined,
        )
        toast('Lagt til i historikken')
        navigate('/mer/historikk', { replace: true })
      }
    } catch {
      setBusy(false)
      setFormError('Oppføringen ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre oppføring' : 'Legg til i historikken'}</h1>
        <Field
          label="Hva ble gjort?"
          hint="Malte hytta, ny kledning, tømte septiktanken …"
          value={title}
          maxLength={200}
          error={titleError}
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleError(undefined)
          }}
        />
        <div className="ha-field">
          <label htmlFor={`${fieldId}-date`}>Når?</label>
          <input
            id={`${fieldId}-date`}
            className="ha-input"
            type="date"
            value={date}
            aria-describedby={`${fieldId}-date-hint`}
            onChange={(e) => {
              setDate(e.target.value)
              setDateError(undefined)
            }}
          />
          <span className="ha-hint" id={`${fieldId}-date-hint`}>
            Husker du bare året, velg en dato det året.
          </span>
          {dateError && <FieldError message={dateError} />}
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-desc`}>
            Beskrivelse <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <textarea
            id={`${fieldId}-desc`}
            className="ha-input"
            aria-describedby={`${fieldId}-desc-hint`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="ha-hint" id={`${fieldId}-desc-hint`}>
            Hvem gjorde det, hva ble brukt (f.eks. malingstype og farge)?
          </span>
        </div>
        {!existing && (
          <>
            {/* Uten capture: telefonen lar deg velge mellom kamera og bilder du har. */}
            <input
              ref={picker}
              type="file"
              accept="image/*"
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
                  <img src={preview} alt="Valgt bilde" />
                </div>
                <div className="row">
                  <button type="button" className="ha-btn ha-btn-ghost" style={{ paddingLeft: 0 }} onClick={() => picker.current?.click()}>
                    <RotateCcw className="ha-ico" aria-hidden="true" />
                    Bytt bilde
                  </button>
                  <button type="button" className="ha-btn ha-btn-ghost" onClick={() => setPhoto(null)}>
                    Fjern bildet
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="photo-slot" style={{ minHeight: 120 }} onClick={() => picker.current?.click()}>
                <ImagePlus className="ha-ico" aria-hidden="true" />
                Legg til bilde
                <span className="t-caption" style={{ fontWeight: 400 }}>
                  Valgfritt
                </span>
              </button>
            )}
          </>
        )}
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? 'Lagrer …' : existing ? 'Lagre endringene' : 'Lagre'}
        </button>
      </form>
    </>
  )
}
