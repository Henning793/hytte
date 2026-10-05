import { useNavigate, useParams } from 'react-router'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { issueMeta, onlyDeleter, statusLabel } from '../../lib/content'
import { deleteRows, updateRow, useTable } from '../../lib/data'
import { useSignedUrl } from '../../lib/files'
import { useNames } from '../../lib/members'
import type { Issue, IssueStatus } from '../../lib/types'
import { useMe } from '../../lib/useMe'

function Photo({ path }: { path: string }) {
  const url = useSignedUrl(path)
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
      () => toast('Statusen ble ikke lagret. Sjekk at du har nett.'),
    )
  }

  async function remove(i: Issue) {
    navigate('/feil', { replace: true })
    try {
      await deleteRows<Issue>('issues', cabin.id, [i.id])
      toast('Feilmeldingen er slettet')
    } catch {
      toast('Feilmeldingen ble ikke slettet. Sjekk at du har nett.')
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
        {canDelete ? (
          <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => remove(issue)}>
            Slett feilmeldingen
          </button>
        ) : (
          <p className="t-caption center">
            Bare {onlyDeleter(name(issue.created_by))} kan slette denne. Alle kan endre status.
          </p>
        )}
      </div>
    </>
  )
}
