import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ImagePlus } from 'lucide-react'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCabins } from '../../lib/cabins'
import { uploadImage } from '../../lib/files'
import { supabase } from '../../lib/supabase'

export function CreateCabin() {
  const navigate = useNavigate()
  const toast = useToast()
  const { cabins, refresh, select } = useCabins()
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Gi hytta et navn, for eksempel «Furulia» eller «Hytta på Geilo».')
      return
    }
    if (!navigator.onLine) {
      setFormError('Du er uten nett. Å opprette en hytte trenger nett, så prøv igjen når du har dekning.')
      return
    }
    setBusy(true)
    setFormError(undefined)
    const id = crypto.randomUUID()
    const { error: rpcError } = await supabase.rpc('create_cabin', { p_name: trimmed, p_id: id })
    if (rpcError) {
      setBusy(false)
      setFormError('Noe gikk galt, og hytta ble ikke opprettet. Prøv igjen om litt.')
      return
    }
    if (photo) {
      // Hytta finnes allerede; et bilde som ikke kommer opp, kan legges til senere.
      try {
        const path = await uploadImage(id, 'cabin', photo)
        await supabase.from('cabins').update({ photo_path: path }).eq('id', id)
      } catch {
        toast('Hytta er opprettet, men bildet kom ikke opp. Legg det til under Mer → Medlemmer.')
      }
    }
    await refresh()
    select(id)
    setBusy(false)
    toast(`${trimmed} er opprettet`)
    navigate('/', { replace: true })
  }

  return (
    <main className="screen">
      <TopBar backTo={cabins.length ? '/mer/hytter' : '/ingen-hytte'} />
      <form className="scroll" onSubmit={submit} noValidate>
        <div className="stack">
          <h1 className="t-title">Opprett hytte</h1>
          <p className="muted">Du blir admin, og kan invitere de andre etterpå.</p>
        </div>
        <Field
          label="Hva heter hytta?"
          value={name}
          maxLength={60}
          autoCapitalize="words"
          error={error}
          onChange={(e) => {
            setName(e.target.value)
            setError(undefined)
          }}
        />
        <div className="ha-field">
          <span className="ha-label">
            Bilde{' '}
            <span className="muted" style={{ fontWeight: 400 }}>
              (valgfritt)
            </span>
          </span>
          <input
            ref={fileInput}
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
          {photo && preview ? (
            <>
              <div className="photo">
                <img src={preview} alt="Valgt bilde av hytta" />
              </div>
              <div>
                <button
                  type="button"
                  className="ha-btn ha-btn-ghost"
                  style={{ paddingLeft: 0 }}
                  onClick={() => setPhoto(null)}
                >
                  Fjern bildet
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="photo-slot" onClick={() => fileInput.current?.click()}>
              <ImagePlus className="ha-ico" aria-hidden="true" />
              Legg til bilde
            </button>
          )}
        </div>
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? 'Oppretter hytte …' : 'Opprett hytte'}
        </button>
      </form>
    </main>
  )
}
