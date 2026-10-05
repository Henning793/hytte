import { useRef, useState, type FormEvent } from 'react'
import { Camera, FileUp } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { categoryLabel } from '../../lib/content'
import { insertRow } from '../../lib/data'
import { MAX_FILE_BYTES, uploadFile } from '../../lib/files'
import { draftMeta, type Doc, type DocCategory } from '../../lib/types'
import { useMe } from '../../lib/useMe'

const accepted = (f: File) => f.type === 'application/pdf' || f.type.startsWith('image/')

/** Navnet på filen uten endelse, eller «Bilde 5. okt.» for bilder fra kameraet. */
function suggestName(file: File, fromCamera: boolean) {
  if (fromCamera || /^(image|IMG|PXL|DSC)[-_\d]/i.test(file.name)) {
    return `Bilde ${new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`
  }
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 200)
}

export function UploadSheet({ onClose }: { onClose: () => void }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const toast = useToast()
  const camera = useRef<HTMLInputElement>(null)
  const picker = useRef<HTMLInputElement>(null)
  const [category, setCategory] = useState<DocCategory>('manualer')
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  function choose(f: File | undefined, fromCamera: boolean) {
    setError(undefined)
    if (!f) return
    if (!accepted(f)) return setError('Bare PDF og bilder kan lastes opp.')
    // Bilder krympes før opplasting, så bare PDF-er stoppes her.
    if (f.type === 'application/pdf' && f.size > MAX_FILE_BYTES) return setError('Filen er for stor. Den kan være opptil 20 MB.')
    setFile(f)
    setName(suggestName(f, fromCamera))
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!file) return
    if (!name.trim()) return setNameError('Gi dokumentet et navn.')
    setBusy(true)
    setError(undefined)
    try {
      const uploaded = await uploadFile(cabin.id, 'documents', file)
      await insertRow<Doc>('documents', { ...draftMeta(cabin.id, me), name: name.trim(), category, file_path: uploaded.path, mime_type: uploaded.mime_type, size_bytes: uploaded.size_bytes })
      toast(`${uploaded.mime_type === 'application/pdf' ? 'PDF-en' : 'Bildet'} er lastet opp til ${categoryLabel[category]}`)
      onClose()
    } catch (e) {
      setBusy(false)
      setError(
        e instanceof Error && e.message === 'too_large'
          ? 'Filen er for stor. Den kan være opptil 20 MB.'
          : 'Filen ble ikke lastet opp. Sjekk at du har nett, og prøv igjen.',
      )
    }
  }

  return (
    <Sheet label="Last opp" onClose={onClose}>
      <h2 className="t-heading">Last opp til</h2>
      <Segmented<DocCategory>
        label="Mappe"
        value={category}
        options={[
          { value: 'manualer', label: 'Manualer' },
          { value: 'dokumenter', label: 'Dokumenter' },
        ]}
        onChange={setCategory}
      />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { choose(e.target.files?.[0], true); e.target.value = '' }} />
      <input ref={picker} type="file" accept="application/pdf,image/*" className="sr-only" tabIndex={-1} aria-hidden="true"
        onChange={(e) => { choose(e.target.files?.[0], false); e.target.value = '' }} />
      {file ? (
        <form className="stack" onSubmit={submit} noValidate>
          <Field label="Navn" value={name} maxLength={200} error={nameError}
            onChange={(e) => { setName(e.target.value); setNameError(undefined) }} />
          {error && <FieldError message={error} />}
          <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
            {busy ? 'Laster opp …' : 'Last opp'}
          </button>
          <button type="button" className="ha-btn ha-btn-ghost ha-btn-block" disabled={busy} onClick={() => setFile(null)}>
            Velg en annen fil
          </button>
        </form>
      ) : (
        <>
          <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={() => camera.current?.click()}>
            <Camera className="ha-ico" aria-hidden="true" />
            Ta bilde
          </button>
          <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={() => picker.current?.click()}>
            <FileUp className="ha-ico" aria-hidden="true" />
            Velg PDF eller bilde
          </button>
          {error && <FieldError message={error} />}
        </>
      )}
    </Sheet>
  )
}
