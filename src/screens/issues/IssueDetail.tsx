import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { issueMeta, onlyDeleter, statusLabel } from '../../lib/content'
import { deleteRows, updateRow, useTable } from '../../lib/data'
import { useFileUrl } from '../../lib/files'
import { useNames } from '../../lib/members'
import type { Issue, IssueStatus } from '../../lib/types'
import { useMe } from '../../lib/useMe'

function Photo({ path }: { path: string }) {
  const url = useFileUrl(path)
  return <div className="photo">{url ? <img src={url} alt="Bilde av feilen" /> : <div style={{ height: 200 }} />}</div>
}

export function IssueDetail() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const { rows } = useTable<Issue>('issues', cabin.id)
  const name = useNames(cabin.id)
  const issue = rows?.find((i) => i.id === id)
  const [confirming, setConfirming] = useState(false)

  if (!rows) return <TopBar backTo="/feil" backLabel="Feil og mangler" />
  if (!issue) {
    return (
      <>
        <TopBar backTo="/feil" backLabel="Feil og mangler" />
        <div className="scroll">
          <p className="empty">Feilmeldingen finnes ikke lenger.</p>
        </div>
      </>
    )
  }

  const canDelete = issue.created_by === me || cabin.role === 'admin'

  function setStatus(i: Issue, status: IssueStatus) {
    if (status === i.status) return
    updateRow<Issue>('issues', cabin.id, i.id, { status }).then(
      () => toast(`Status: ${statusLabel[status]}`),
      () => toast('Statusen ble ikke lagret. Prøv igjen.'),
    )
  }

  async function remove(i: Issue) {
    navigate('/feil', { replace: true })
    try {
      await deleteRows('issues', cabin.id, [i.id])
      toast('Feilmeldingen er slettet')
    } catch {
      toast('Feilmeldingen ble ikke slettet. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backTo="/feil" backLabel="Feil og mangler" />
      <div className="scroll">
        {issue.photo_path && <Photo path={issue.photo_path} />}
        <div className="stack">
          <h1 className="t-title">{issue.title}</h1>
          <p className="t-caption">{issueMeta(issue, name)}</p>
          {issue.description && (
            <p className="t-body-lg" style={{ whiteSpace: 'pre-wrap' }}>
              {issue.description}
            </p>
          )}
        </div>
        <div className="stack">
          <span className="ha-label">Status</span>
          <Segmented<IssueStatus>
            label="Status"
            value={issue.status}
            options={[
              { value: 'ny', label: 'Ny' },
              { value: 'pagar', label: 'Pågår' },
              { value: 'fikset', label: 'Fikset' },
            ]}
            onChange={(s) => setStatus(issue, s)}
          />
        </div>
        <Link className="ha-btn ha-btn-secondary ha-btn-block" to={`/feil/${issue.id}/endre`}>
          Endre
        </Link>
        {canDelete ? (
          <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => setConfirming(true)}>
            Slett feilmeldingen
          </button>
        ) : (
          <p className="t-caption center">
            Bare {onlyDeleter(name(issue.created_by))} kan slette denne. Alle kan endre den.
          </p>
        )}
      </div>
      {confirming && (
        <ConfirmSheet title="Slette feilmeldingen?" confirmLabel="Slett feilmeldingen" onConfirm={() => remove(issue)} onClose={() => setConfirming(false)}>
          «{issue.title}» blir borte for alle, også bildet.
        </ConfirmSheet>
      )}
    </>
  )
}
