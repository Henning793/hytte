import { useNavigate } from 'react-router'
import { Camera, DoorOpen } from 'lucide-react'
import { CabinSwitcher } from '../components/CabinSwitcher'
import { StatusBadge } from '../components/StatusBadge'
import { useCurrentCabin } from '../lib/cabins'
import { newestFirst, sortOpen, taskMeta } from '../lib/content'
import { useTable } from '../lib/data'
import { count } from '../lib/format'
import { useNames } from '../lib/members'
import type { Issue, ShoppingItem, Task } from '../lib/types'

export function Home() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const name = useNames(cabin.id)
  const issues = useTable<Issue>('issues', cabin.id).rows
  const tasks = useTable<Task>('tasks', cabin.id).rows
  const items = useTable<ShoppingItem>('shopping_items', cabin.id).rows

  const openIssues = (issues ?? []).filter((i) => i.status !== 'fikset').sort(newestFirst)
  const openTasks = (tasks ?? []).filter((t) => !t.done).sort(sortOpen)
  const next = openTasks[0]
  const toBuy = (items ?? []).filter((i) => !i.done).sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <>
      <CabinSwitcher />
      <div className="scroll" style={{ paddingTop: 12 }}>
        <div className="tiles">
          <button type="button" className="ha-tile ha-tile-primary" onClick={() => navigate('/feil/ny')}>
            <Camera className="ha-ico" aria-hidden="true" />
            Meld feil
          </button>
          <button type="button" className="ha-tile ha-tile-secondary" onClick={() => navigate('/mer/sjekkliste')}>
            <DoorOpen className="ha-ico" aria-hidden="true" />
            Ankomst / Avreise
          </button>
        </div>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/feil')}>
          <span className="sec-h">
            <h2 className="t-heading">Feil og mangler</h2>
            {issues && openIssues.length > 0 && <span className="t-caption">{count(openIssues.length, 'åpen', 'åpne')}</span>}
          </span>
          {openIssues.slice(0, 2).map((i) => (
            <span key={i.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-lg grow">{i.title}</span>
              <StatusBadge status={i.status} />
            </span>
          ))}
          {issues && openIssues.length === 0 && <span className="muted">Ingen åpne feil. Fint!</span>}
        </button>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/gjoremal')}>
          <span className="sec-h">
            <h2 className="t-heading">Neste gjøremål</h2>
            {tasks && openTasks.length > 0 && <span className="t-caption">{openTasks.length} igjen</span>}
          </span>
          {next && (
            <span className="stack" style={{ gap: 2 }}>
              <span className="t-body-lg">{next.title}</span>
              <span className="t-caption">{taskMeta(next, name)}</span>
            </span>
          )}
          {tasks && !next && <span className="muted">Ingen gjøremål. Legg til det første under Gjøremål.</span>}
        </button>

        <button type="button" className="ha-card card-link" onClick={() => navigate('/handleliste')}>
          <span className="sec-h">
            <h2 className="t-heading">Handleliste</h2>
            {items && toBuy.length > 0 && <span className="t-caption">{count(toBuy.length, 'vare', 'varer')}</span>}
          </span>
          {items && (
            <span className="muted">{toBuy.length ? toBuy.map((i) => i.name).join(', ') : 'Ingenting på lista.'}</span>
          )}
        </button>
      </div>
    </>
  )
}
