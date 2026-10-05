import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router'

type Props = {
  /** Hvor «Tilbake» går. Uten verdi går den ett steg tilbake i historikken. */
  backTo?: string
  backLabel?: string
}

/** react-router teller sidene i appen i history.state.idx. */
const canGoBack = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

export function TopBar({ backTo, backLabel = 'Tilbake' }: Props) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      <button
        type="button"
        className="back"
        // Åpnet fra en lenke (ingen historikk i appen): gå til Hjem i stedet for ut av appen.
        onClick={() => (backTo ? navigate(backTo) : canGoBack() ? navigate(-1) : navigate('/'))}
      >
        <ChevronLeft className="ha-ico" aria-hidden="true" />
        {backLabel}
      </button>
    </div>
  )
}
