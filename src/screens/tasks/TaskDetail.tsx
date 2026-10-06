import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { FaultBadge } from '../../components/FaultBadge'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { onlyDeleter, useToggleTask } from '../../lib/content'
import { deleteRows, useTable } from '../../lib/data'
import { removeFile, useFileUrl } from '../../lib/files'
import { formatDay } from '../../lib/format'
import { useNames } from '../../lib/members'
import type { Task } from '../../lib/types'
import { useMe } from '../../lib/useMe'

function Photo({ path }: { path: string }) {
  const url = useFileUrl(path)
  return <div className="photo">{url ? <img src={url} alt="Bilde som hører til oppgaven" /> : <div style={{ height: 200 }} />}</div>
}

export function TaskDetail() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const { rows } = useTable<Task>('tasks', cabin.id)
  const name = useNames(cabin.id)
  const toggle = useToggleTask()
  const [confirming, setConfirming] = useState(false)
  const task = rows?.find((t) => t.id === id)

  if (!rows) return <TopBar backTo="/oppgaver" backLabel="Oppgaver" />
  if (!task) {
    return (
      <>
        <TopBar backTo="/oppgaver" backLabel="Oppgaver" />
        <div className="scroll">
          <p className="empty">Oppgaven finnes ikke lenger.</p>
        </div>
      </>
    )
  }

  const canDelete = task.created_by === me || cabin.role === 'admin'

  async function remove(t: Task) {
    navigate('/oppgaver', { replace: true })
    try {
      await deleteRows('tasks', cabin.id, [t.id])
      if (t.photo_path && !t.photo_path.startsWith('local:')) void removeFile(t.photo_path)
      toast('Oppgaven er slettet')
    } catch {
      toast('Oppgaven ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backTo="/oppgaver" backLabel="Oppgaver" />
      <div className="scroll">
        {task.photo_path && <Photo path={task.photo_path} />}
        <div className="stack">
          {task.kind === 'feil' && (
            <span>
              <FaultBadge />
            </span>
          )}
          <h1 className="t-title">{task.title}</h1>
          {task.description && (
            <p className="t-body-lg" style={{ whiteSpace: 'pre-wrap' }}>
              {task.description}
            </p>
          )}
        </div>
        <div className="ha-list">
          <div className="ha-li">
            <span className="ha-li-main">
              <span className="ha-li-meta">Ansvarlig</span>
              <span className="ha-li-title">{task.responsible_user_id ? name(task.responsible_user_id) : 'Ingen ennå'}</span>
            </span>
          </div>
          <div className="ha-li">
            <span className="ha-li-main">
              <span className="ha-li-meta">Frist</span>
              <span className="ha-li-title">{task.due_date ? formatDay(task.due_date) : 'Ingen frist'}</span>
            </span>
          </div>
          <div className="ha-li">
            <span className="ha-li-main">
              <span className="ha-li-meta">{task.kind === 'feil' ? 'Meldt av' : 'Opprettet av'}</span>
              <span className="ha-li-title">
                {name(task.created_by)} · {formatDay(task.created_at)}
              </span>
            </span>
          </div>
          {task.done && (
            <div className="ha-li">
              <span className="ha-li-main">
                <span className="ha-li-meta">{task.kind === 'feil' ? 'Fikset' : 'Gjort'}</span>
                <span className="ha-li-title">
                  {[task.done_by && name(task.done_by), task.done_at && formatDay(task.done_at)].filter(Boolean).join(' · ') || 'Ja'}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="stack">
          <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={() => toggle(task)}>
            {task.kind === 'feil' ? (task.done ? 'Merk som ikke fikset' : 'Merk som fikset') : task.done ? 'Merk som ikke gjort' : 'Merk som gjort'}
          </button>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to={`/oppgaver/${task.id}/endre`}>
            Endre
          </Link>
          {canDelete ? (
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
              Slett oppgaven
            </button>
          ) : (
            <p className="t-caption center">Bare {onlyDeleter(name(task.created_by))} kan slette denne oppgaven. Alle kan endre den.</p>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmSheet title="Slette oppgaven?" confirmLabel="Slett oppgaven" onConfirm={() => remove(task)} onClose={() => setConfirming(false)}>
          «{task.title}» blir borte for alle{task.photo_path ? ', også bildet' : ''}.
        </ConfirmSheet>
      )}
    </>
  )
}
