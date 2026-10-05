import { useEffect } from 'react'
import { Check, Clock, CloudOff } from 'lucide-react'
import { onSyncError, useSyncState } from '../lib/data'
import { useToast } from './Toast'

/** Diskret pille øverst: frakoblet, eller «Alt er sendt» i 3 sekunder når nettet er tilbake. */
export function OfflineBanner() {
  const { offline, pending, synced } = useSyncState()
  const toast = useToast()

  // Endringer som ble avvist etter at skjermen var gått videre.
  useEffect(() => onSyncError(toast), [toast])

  if (offline) {
    return (
      <div className="offline-wrap">
        <div className="ha-offline" role="status">
          <CloudOff className="ha-ico" aria-hidden="true" />
          Frakoblet · {pending ? (pending === 1 ? '1 endring venter' : `${pending} endringer venter`) : 'endringer sendes når du får nett'}
        </div>
      </div>
    )
  }
  if (synced) {
    return (
      <div className="offline-wrap">
        <div className="ha-offline is-synced" role="status">
          <Check className="ha-ico" aria-hidden="true" />
          Alt er sendt
        </div>
      </div>
    )
  }
  return null
}

/** «Venter på nett ·» foran metateksten på rader som ikke er sendt ennå. */
export function PendingMark({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="pending">
      <Clock className="ha-ico" aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: '-2px', marginRight: 4 }} />
      Venter på nett ·{' '}
    </span>
  )
}
