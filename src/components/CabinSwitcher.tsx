import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, ChevronDown } from 'lucide-react'
import { useCabins, type Cabin } from '../lib/cabins'
import { CabinAvatar } from './CabinAvatar'
import { Sheet } from './Sheet'

function cabinMeta(c: Cabin) {
  const members = c.member_count === 1 ? '1 medlem' : `${c.member_count} medlemmer`
  return `${c.role === 'admin' ? 'Du er admin' : 'Medlem'} · ${members}`
}

/** Liste over hyttene mine, brukt i arket og på «Mine hytter». */
export function CabinList({ onPick }: { onPick: (c: Cabin) => void }) {
  const { cabins, current } = useCabins()
  return (
    <div className="ha-list">
      {cabins.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className="ha-li"
          aria-current={c.id === current?.id ? 'true' : undefined}
          onClick={() => onPick(c)}
        >
          <CabinAvatar name={c.name} photoPath={c.photo_path} alt={i % 2 === 1} />
          <span className="ha-li-main">
            <span className="ha-li-title">{c.name}</span>
            <span className="ha-li-meta">{cabinMeta(c)}</span>
          </span>
          {c.id === current?.id && (
            <span style={{ color: 'var(--primary)' }}>
              <Check className="ha-ico" aria-hidden="true" />
              <span className="sr-only">Valgt</span>
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Hyttenavnet øverst på Hjem. Er man med i flere hytter, åpner det et ark. */
export function CabinSwitcher() {
  const { cabins, current, select } = useCabins()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!current) return null
  const multi = cabins.length > 1

  return (
    <div className="home-head">
      <CabinAvatar name={current.name} photoPath={current.photo_path} />
      {multi ? (
        <button
          type="button"
          className="ha-switch"
          aria-haspopup="dialog"
          aria-label={`Bytt hytte. Nå: ${current.name}`}
          onClick={() => setOpen(true)}
        >
          {current.name}
          <ChevronDown className="ha-ico" aria-hidden="true" />
        </button>
      ) : (
        <h1 className="ha-switch is-static">{current.name}</h1>
      )}
      {open && (
        <Sheet label="Velg hytte" onClose={() => setOpen(false)}>
          <h2 className="t-heading">Bytt hytte</h2>
          <CabinList
            onPick={(c) => {
              select(c.id)
              setOpen(false)
            }}
          />
          <button type="button" className="ha-btn ha-btn-ghost" onClick={() => navigate('/mer/hytter')}>
            Mine hytter
          </button>
        </Sheet>
      )}
    </div>
  )
}
