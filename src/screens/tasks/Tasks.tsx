import { Link, useNavigate } from 'react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { CheckBox } from '../../components/CheckBox'
import { FaultBadge } from '../../components/FaultBadge'
import { PendingMark } from '../../components/OfflineBanner'
import { useCurrentCabin } from '../../lib/cabins'
import { sortOpen, taskMeta, useToggleTask } from '../../lib/content'
import { usePendingIds, useTable } from '../../lib/data'
import { formatDay } from '../../lib/format'
import { useNames } from '../../lib/members'
import type { Task } from '../../lib/types'

export function Tasks() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const { rows } = useTable<Task>('tasks', cabin.id)
  const name = useNames(cabin.id)
  const toggle = useToggleTask()
  const pending = usePendingIds()

  const open = (rows ?? []).filter((t) => !t.done).sort(sortOpen)
  const done = (rows ?? []).filter((t) => t.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))

  return (
    <div className="scroll" style={{ paddingTop: 20 }}>
      <h1 className="t-title">Oppgaver</h1>
      {rows && open.length === 0 && <div className="empty">Ingenting som må fikses eller gjøres. Fint!</div>}
      {open.length > 0 && (
        <div className="ha-list">
          {open.map((t) => (
            <div key={t.id} className="ha-li" style={{ paddingLeft: 4 }}>
              <button
                type="button"
                className="ha-check"
                role="checkbox"
                aria-checked={false}
                aria-label={`Merk «${t.title}» som gjort`}
                style={{ width: 'auto', border: 0, padding: '0 0 0 12px', minHeight: 56 }}
                onClick={() => toggle(t)}
              >
                <CheckBox />
              </button>
              <button
                type="button"
                className="ha-li-main"
                style={{ border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: '4px 0', minHeight: 56, justifyContent: 'center' }}
                onClick={() => navigate(`/oppgaver/${t.id}`)}
              >
                <span className="ha-li-title">{t.title}</span>
                <span className="ha-li-meta">
                  <PendingMark show={pending.has(t.id)} />
                  {taskMeta(t, name)}
                </span>
              </button>
              {t.kind === 'feil' && <FaultBadge />}
              <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
            </div>
          ))}
        </div>
      )}

      <Link className="ha-btn ha-btn-primary ha-btn-block" to="/oppgaver/ny">
        <Plus className="ha-ico" aria-hidden="true" />
        Ny oppgave
      </Link>

      {done.length > 0 && (
        <>
          <h2 className="list-h">Fullført</h2>
          <div className="ha-list">
            {done.map((t) => (
              <button key={t.id} type="button" className="ha-check" role="checkbox" aria-checked onClick={() => toggle(t)}>
                <CheckBox />
                <span className="ha-li-main">
                  <span className="ha-li-title">{t.title}</span>
                  <span className="ha-li-meta">
                    <PendingMark show={pending.has(t.id)} />
                    {t.done_by ? `Gjort av ${name(t.done_by)}` : 'Gjort'}
                    {t.done_at ? ` · ${formatDay(t.done_at)}` : ''}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
