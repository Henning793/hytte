import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { onlyDeleter, useToggleTask } from '../../lib/content'
import { deleteRows, useTable } from '../../lib/data'
import { formatDay } from '../../lib/format'
import { useNames } from '../../lib/members'
import type { Task } from '../../lib/types'
import { useMe } from '../../lib/useMe'

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

  if (!rows) return <TopBar backTo="/gjoremal" backLabel="Gjøremål" />
  if (!task) {
    return (
      <>
        <TopBar backTo="/gjoremal" backLabel="Gjøremål" />
        <div className="scroll">
          <p className="empty">Gjøremålet finnes ikke lenger.</p>
        </div>
      </>
    )
  }

  const canDelete = task.created_by === me || cabin.role === 'admin'

  async function remove(t: Task) {
    navigate('/gjoremal', { replace: true })
    try {
      await deleteRows('tasks', cabin.id, [t.id])
      toast('Gjøremålet er slettet')
    } catch {
      toast('Gjøremålet ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backTo="/gjoremal" backLabel="Gjøremål" />
      <div className="scroll">
        <div className="stack">
          <span>
            <span className="ha-badge ha-badge-neutral">{task.kind === 'vedlikehold' ? 'Vedlikehold' : 'Gjøremål'}</span>
          </span>
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
              <span className="ha-li-meta">Opprettet av</span>
              <span className="ha-li-title">
                {name(task.created_by)} · {formatDay(task.created_at)}
              </span>
            </span>
          </div>
          {task.done && (
            <div className="ha-li">
              <span className="ha-li-main">
                <span className="ha-li-meta">Gjort av</span>
                <span className="ha-li-title">
                  {name(task.done_by)}
                  {task.done_at ? ` · ${formatDay(task.done_at)}` : ''}
                </span>
              </span>
            </div>
          )}
        </div>
        <div className="stack">
          <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={() => toggle(task)}>
            {task.done ? 'Merk som ikke gjort' : 'Merk som gjort'}
          </button>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to={`/gjoremal/${task.id}/endre`}>
            Endre
          </Link>
          {canDelete ? (
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
              Slett gjøremålet
            </button>
          ) : (
            <p className="t-caption center">Bare {onlyDeleter(name(task.created_by))} kan slette dette gjøremålet.</p>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmSheet title="Slette gjøremålet?" confirmLabel="Slett gjøremålet" onConfirm={() => remove(task)} onClose={() => setConfirming(false)}>
          «{task.title}» blir borte for alle.
        </ConfirmSheet>
      )}
    </>
  )
}
