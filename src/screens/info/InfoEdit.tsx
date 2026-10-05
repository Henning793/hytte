import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Field, FieldError } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { saveInfo, useCabinInfo, type InfoFields } from '../../lib/info'
import type { CabinInfo } from '../../lib/types'

export function InfoEdit() {
  const cabin = useCurrentCabin()
  const { info, loaded } = useCabinInfo(cabin.id)
  if (!loaded) return <TopBar backLabel="Avbryt" />
  return <InfoForm info={info} />
}

function TextArea({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="ha-field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="ha-input" value={value} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
      {hint && (
        <span className="ha-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  )
}

function InfoForm({ info }: { info: CabinInfo | null }) {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const toast = useToast()
  const [f, setF] = useState({
    wifi_name: info?.wifi_name ?? '',
    wifi_password: info?.wifi_password ?? '',
    keybox_code: info?.keybox_code ?? '',
    keybox_location: info?.keybox_location ?? '',
    trash_info: info?.trash_info ?? '',
    store_info: info?.store_info ?? '',
    notes: info?.notes ?? '',
  })
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (v: string) => setF((old) => ({ ...old, [k]: v }))

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    setBusy(true)
    const fields = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as InfoFields
    try {
      await saveInfo(cabin.id, fields)
      toast('Info og koder er lagret')
      navigate('/mer/info', { replace: true })
    } catch {
      setBusy(false)
      setError('Endringene ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">Endre info og koder</h1>
        <h2 className="list-h">Wifi</h2>
        <Field label="Nettverk" value={f.wifi_name} autoComplete="off" onChange={(e) => set('wifi_name')(e.target.value)} />
        <Field label="Passord" value={f.wifi_password} autoComplete="off" spellCheck={false} onChange={(e) => set('wifi_password')(e.target.value)} />
        <h2 className="list-h">Nøkkelboks</h2>
        <Field label="Kode" value={f.keybox_code} autoComplete="off" inputMode="numeric" hint="Vises bare når noen trykker «Vis kode»." onChange={(e) => set('keybox_code')(e.target.value)} />
        <TextArea label="Hvor er nøkkelboksen?" value={f.keybox_location} onChange={set('keybox_location')} />
        <h2 className="list-h">Praktisk</h2>
        <TextArea label="Søppeltømming" value={f.trash_info} onChange={set('trash_info')} />
        <TextArea label="Nærmeste butikk" value={f.store_info} onChange={set('store_info')} hint="Navn, avstand og åpningstider." />
        <TextArea label="Greit å vite" value={f.notes} onChange={set('notes')} hint="For eksempel hvor hovedkranen og sikringsskapet er." />
        {error && <FieldError message={error} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {busy ? 'Lagrer …' : 'Lagre'}
        </button>
      </form>
    </>
  )
}
