import { useEffect, useId, useState } from 'react'
import { Check } from 'lucide-react'
import { FieldError } from '../../components/Field'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { saveFerry, searchFerryStops } from '../../lib/ferry'
import type { Ferry, FerryStop } from '../../lib/types'

/** Velg brygga dere reiser fra og brygga ved hytta. Gjelder alle i hytta. */
export function FerrySetup({ ferry, onClose }: { ferry: Ferry | null; onClose: () => void }) {
  const cabin = useCurrentCabin()
  const toast = useToast()
  const [home, setHome] = useState<FerryStop | null>(ferry?.home ?? null)
  const [stay, setStay] = useState<FerryStop | null>(ferry?.cabin ?? null)
  const [error, setError] = useState<string>()

  async function save(next: Ferry | null) {
    try {
      await saveFerry(cabin.id, next)
      toast(next ? 'Bryggene er lagret' : 'Fergen er fjernet')
      onClose()
    } catch {
      setError('Endringene ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <Sheet label="Velg brygger" onClose={onClose}>
      <h2 className="t-heading">Velg brygger</h2>
      <StopPicker label="Brygga dere reiser fra" value={home} onChange={setHome} />
      <StopPicker label="Brygga ved hytta" value={stay} onChange={setStay} />
      {error && <FieldError message={error} />}
      <button
        type="button"
        className="ha-btn ha-btn-primary ha-btn-block"
        disabled={!home || !stay || home.id === stay.id}
        onClick={() => home && stay && save({ home, cabin: stay })}
      >
        Lagre
      </button>
      {ferry && (
        <button type="button" className="ha-btn ha-btn-ghost" onClick={() => save(null)}>
          Vi bruker ikke ferge
        </button>
      )}
    </Sheet>
  )
}

function StopPicker({ label, value, onChange }: { label: string; value: FerryStop | null; onChange: (s: FerryStop) => void }) {
  const id = useId()
  const [text, setText] = useState('')
  const [hits, setHits] = useState<(FerryStop & { label: string })[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) return
    let stale = false
    const timer = setTimeout(() => {
      searchFerryStops(q).then(
        (list) => !stale && (setHits(list), setFailed(false)),
        () => !stale && setFailed(true),
      )
    }, 300)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [text])

  const searching = text.trim().length >= 2

  return (
    <div className="ha-field">
      <label htmlFor={id}>{label}</label>
      {value && !searching && (
        <span className="row t-body-lg" style={{ gap: 6 }}>
          <Check className="ha-ico" aria-hidden="true" style={{ color: 'var(--primary)' }} />
          {value.name}
        </span>
      )}
      <input
        id={id}
        className="ha-input"
        type="search"
        autoComplete="off"
        placeholder={value ? 'Søk for å bytte' : 'Søk, f.eks. Gravningsund'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {searching && failed && <span className="ha-hint">Fikk ikke søkt. Sjekk nettet og prøv igjen.</span>}
      {searching && !failed && hits && hits.length === 0 && <span className="ha-hint">Fant ingen fergeleier som passer.</span>}
      {searching && !failed && hits && hits.length > 0 && (
        <div className="ha-list">
          {hits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="ha-li"
              onClick={() => {
                onChange({ id: h.id, name: h.name })
                setText('')
                setHits(null)
              }}
            >
              <span className="ha-li-main">
                <span className="ha-li-title">{h.name}</span>
                <span className="ha-li-meta">{h.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
