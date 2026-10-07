import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, DoorOpen, ListChecks, ShoppingCart, Wrench } from 'lucide-react'
import { CabinSwitcher } from '../components/CabinSwitcher'
import { FaultBadge } from '../components/FaultBadge'
import { Sheet } from '../components/Sheet'
import { FerryCard } from './ferry/FerryCard'
import { useCurrentCabin } from '../lib/cabins'
import { sortOpen, taskMeta } from '../lib/content'
import { useTable } from '../lib/data'
import { count } from '../lib/format'
import { useNames } from '../lib/members'
import type { ShoppingItem, Task } from '../lib/types'

export function Home() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const name = useNames(cabin.id)
  const tasks = useTable<Task>('tasks', cabin.id).rows
  const items = useTable<ShoppingItem>('shopping_items', cabin.id).rows
  const [choosing, setChoosing] = useState(false)

  const openTasks = (tasks ?? []).filter((t) => !t.done).sort(sortOpen)
  const toBuy = (items ?? []).filter((i) => !i.done).sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <>
      <CabinSwitcher />
      <div className="scroll" style={{ paddingTop: 12 }}>
        <div className="tiles">
          <button type="button" className="ha-tile ha-tile-primary" onClick={() => setChoosing(true)}>
            <Wrench className="ha-ico" aria-hidden="true" />
            Noe som mangler eller må fikses?
          </button>
          <button type="button" className="ha-tile ha-tile-secondary" onClick={() => navigate('/mer/sjekkliste')}>
            <DoorOpen className="ha-ico" aria-hidden="true" />
            Ankomst / Avreise
          </button>
        </div>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/handleliste')}>
          <span className="sec-h">
            <h2 className="t-heading">Handleliste</h2>
            {items && toBuy.length > 0 && <span className="t-caption">{count(toBuy.length, 'vare', 'varer')}</span>}
          </span>
          {items && (
            <span className="muted">{toBuy.length ? toBuy.map((i) => i.name).join(', ') : 'Ingenting på lista.'}</span>
          )}
        </button>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/oppgaver')}>
          <span className="sec-h">
            <h2 className="t-heading">Oppgaver</h2>
            {tasks && openTasks.length > 0 && <span className="t-caption">{openTasks.length} igjen</span>}
          </span>
          {openTasks.slice(0, 2).map((t) => (
            <span key={t.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span className="stack grow" style={{ gap: 2 }}>
                <span className="t-body-lg">{t.title}</span>
                <span className="t-caption">{taskMeta(t, name)}</span>
              </span>
              {t.kind === 'feil' && <FaultBadge />}
            </span>
          ))}
          {tasks && openTasks.length === 0 && <span className="muted">Ingenting som må fikses eller gjøres. Fint!</span>}
        </button>

        <FerryCard />
      </div>
      {choosing && (
        <Sheet label="Hva gjelder det?" onClose={() => setChoosing(false)}>
          <h2 className="t-heading">Hva gjelder det?</h2>
          <div className="ha-list">
            <button type="button" className="ha-li" onClick={() => navigate('/handleliste', { state: { add: true } })}>
              <ShoppingCart className="ha-ico" aria-hidden="true" />
              <span className="ha-li-main">
                <span className="ha-li-title">Noe må kjøpes</span>
                <span className="ha-li-meta">Settes på handlelisten</span>
              </span>
              <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
            </button>
            <button type="button" className="ha-li" onClick={() => navigate('/oppgaver/ny', { state: { kind: 'feil' } })}>
              <Wrench className="ha-ico" aria-hidden="true" />
              <span className="ha-li-main">
                <span className="ha-li-title">Noe er ødelagt</span>
                <span className="ha-li-meta">Meld feil, gjerne med bilde</span>
              </span>
              <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
            </button>
            <button type="button" className="ha-li" onClick={() => navigate('/oppgaver/ny', { state: { kind: 'oppgave' } })}>
              <ListChecks className="ha-ico" aria-hidden="true" />
              <span className="ha-li-main">
                <span className="ha-li-title">Noe annet må gjøres</span>
                <span className="ha-li-meta">Legg til en oppgave</span>
              </span>
              <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="ha-btn ha-btn-ghost" onClick={() => setChoosing(false)}>
            Avbryt
          </button>
        </Sheet>
      )}
    </>
  )
}

