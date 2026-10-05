import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { onlyDeleter } from '../../lib/content'
import { formatFullDay } from '../../lib/dates'
import { deleteRows, useTable } from '../../lib/data'
import { removeFile, useFileUrl } from '../../lib/files'
import { useNames } from '../../lib/members'
import type { HistoryEntry } from '../../lib/types'
import { useMe } from '../../lib/useMe'

function Photo({ path }: { path: string }) {
  const url = useFileUrl(path)
  return <div className="photo">{url ? <img src={url} alt="Bilde" /> : <div style={{ height: 200 }} />}</div>
}

export function HistoryDetail() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const { rows } = useTable<HistoryEntry>('history_entries', cabin.id)
  const name = useNames(cabin.id)
  const [confirming, setConfirming] = useState(false)
  const entry = rows?.find((e) => e.id === id)

  if (!rows) return <TopBar backTo="/mer/historikk" backLabel="Historikk" />
  if (!entry) {
    return (
      <>
        <TopBar backTo="/mer/historikk" backLabel="Historikk" />
        <div className="scroll">
          <p className="empty">Oppføringen finnes ikke lenger.</p>
        </div>
      </>
    )
  }

  const canDelete = entry.created_by === me || cabin.role === 'admin'

  async function remove(e: HistoryEntry) {
    navigate('/mer/historikk', { replace: true })
    try {
      await deleteRows('history_entries', cabin.id, [e.id])
      if (e.photo_path && !e.photo_path.startsWith('local:')) void removeFile(e.photo_path)
      toast('Oppføringen er slettet')
    } catch {
      toast('Oppføringen ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backTo="/mer/historikk" backLabel="Historikk" />
      <div className="scroll">
        {entry.photo_path && <Photo path={entry.photo_path} />}
        <div className="stack">
          <h1 className="t-title">{entry.title}</h1>
          <p className="t-caption">
            {formatFullDay(entry.happened_on)} · lagt inn av {name(entry.created_by)}
          </p>
          {entry.description && (
            <p className="t-body-lg" style={{ whiteSpace: 'pre-wrap' }}>
              {entry.description}
            </p>
          )}
        </div>
        <div className="stack">
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to={`/mer/historikk/${entry.id}/endre`}>
            Endre
          </Link>
          {canDelete ? (
            <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
              Slett oppføringen
            </button>
          ) : (
            <p className="t-caption center">Bare {onlyDeleter(name(entry.created_by))} kan slette denne oppføringen.</p>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmSheet title="Slette oppføringen?" confirmLabel="Slett oppføringen" onConfirm={() => remove(entry)} onClose={() => setConfirming(false)}>
          «{entry.title}» blir borte fra historikken for alle{entry.photo_path ? ', også bildet' : ''}.
        </ConfirmSheet>
      )}
    </>
  )
}
