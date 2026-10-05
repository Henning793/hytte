import { Link, Navigate } from 'react-router'
import { Plus } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { useCabins } from '../../lib/cabins'
import { pendingInvite } from '../../lib/invite'

export function NoCabin() {
  const { firstName } = useAuth()
  const { current, loading } = useCabins()

  if (loading) return null
  // Kom brukeren hit fra en invitasjonslenke, fortsetter vi dit.
  const invite = pendingInvite()
  if (invite) return <Navigate to={`/bli-med/${invite}`} replace />
  if (current) return <Navigate to="/" replace />

  return (
    <main className="screen">
      <div className="scroll" style={{ paddingTop: 40, justifyContent: 'space-between' }}>
        <div className="stack-lg">
          <h1 className="t-display">{firstName ? `Hei, ${firstName}!` : 'Hei!'}</h1>
          <p className="t-body-lg muted">
            Du er ikke med i noen hytte ennå. Opprett din egen, eller bli med i en du er invitert til.
          </p>
        </div>
        <div className="stack">
          <Link className="ha-btn ha-btn-primary ha-btn-block" to="/opprett-hytte">
            <Plus className="ha-ico" aria-hidden="true" />
            Opprett hytte
          </Link>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/bli-med">
            Jeg har fått en invitasjonslenke
          </Link>
        </div>
      </div>
    </main>
  )
}
