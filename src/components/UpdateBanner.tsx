import { RefreshCw } from 'lucide-react'
import { applyUpdate, useUpdateReady } from '../lib/update'

/** Pille øverst når en ny versjon av appen er klar. */
export function UpdateBanner() {
  const ready = useUpdateReady()
  if (!ready) return null
  return (
    <div className="offline-wrap">
      <button type="button" className="ha-offline is-update" onClick={applyUpdate}>
        <RefreshCw className="ha-ico" aria-hidden="true" />
        Ny versjon tilgjengelig · Oppdater
      </button>
    </div>
  )
}
