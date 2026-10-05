import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

type Props = {
  /** Hvor «Tilbake» går. Uten verdi går den ett steg tilbake i historikken. */
  backTo?: string
  backLabel?: string
}

export function TopBar({ backTo, backLabel = 'Tilbake' }: Props) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      <button
        type="button"
        className="back"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
      >
        <ChevronLeft className="ha-ico" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  )
}
