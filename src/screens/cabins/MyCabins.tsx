import { Link, useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { CabinList } from '../../components/CabinSwitcher'
import { TopBar } from '../../components/TopBar'
import { useCabins } from '../../lib/cabins'

export function MyCabins() {
  const { select } = useCabins()
  const navigate = useNavigate()
  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <h1 className="t-title">Mine hytter</h1>
        <CabinList
          onPick={(c) => {
            select(c.id)
            navigate('/')
          }}
        />
        <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/opprett-hytte">
          <Plus className="ha-ico" aria-hidden="true" />
          Opprett ny hytte
        </Link>
        <Link className="ha-btn ha-btn-ghost" to="/bli-med">
          Jeg har fått en invitasjonslenke
        </Link>
      </div>
    </>
  )
}
