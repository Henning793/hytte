import { Link, useNavigate } from 'react-router'
import { Camera } from 'lucide-react'
import { PendingMark } from '../../components/OfflineBanner'
import { StatusBadge } from '../../components/StatusBadge'
import { useCurrentCabin } from '../../lib/cabins'
import { issueMeta, newestFirst } from '../../lib/content'
import { usePendingIds, useTable } from '../../lib/data'
import { useNames } from '../../lib/members'
import type { Issue } from '../../lib/types'

export function Issues() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const { rows } = useTable<Issue>('issues', cabin.id)
  const name = useNames(cabin.id)
  const pending = usePendingIds()
  const open = (rows ?? []).filter((i) => i.status !== 'fikset').sort(newestFirst)
  const fixed = (rows ?? []).filter((i) => i.status === 'fikset').sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const row = (i: Issue) => (
    <button key={i.id} type="button" className="ha-li" onClick={() => navigate(`/feil/${i.id}`)}>
      <span className="ha-li-main">
        <span className="ha-li-title">{i.title}</span>
        <span className="ha-li-meta">
          <PendingMark show={pending.has(i.id)} />
          {issueMeta(i, name)}
        </span>
      </span>
      <StatusBadge status={i.status} />
    </button>
  )

  return (
    <div className="scroll" style={{ paddingTop: 20 }}>
      <h1 className="t-title">Feil og mangler</h1>
      <Link className="ha-btn ha-btn-primary ha-btn-block" to="/feil/ny">
        <Camera className="ha-ico" aria-hidden="true" />
        Meld feil
      </Link>
      {open.length > 0 && (
        <div className="stack">
          <h2 className="list-h">Åpne</h2>
          <div className="ha-list">{open.map(row)}</div>
        </div>
      )}
      {rows && open.length === 0 && (
        <div className="empty">Ingen åpne feil. Ser du noe som er ødelagt, trykk «Meld feil».</div>
      )}
      {fixed.length > 0 && (
        <div className="stack">
          <h2 className="list-h">Fikset</h2>
          <div className="ha-list">{fixed.map(row)}</div>
        </div>
      )}
    </div>
  )
}
