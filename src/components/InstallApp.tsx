import { useState } from 'react'
import { Share, SquarePlus, X } from 'lucide-react'
import { Sheet } from './Sheet'
import { dismissInstall, promptInstall, useInstallState, type InstallMethod } from '../lib/install'

/**
 * Felles for kortet på Hjem og raden under Mer: hvordan appen kan installeres
 * her, og en `install()` som enten åpner nettleserens dialog eller veiledningen
 * for iOS. `guide` må tegnes av den som bruker hooken.
 */
export function useInstallApp() {
  const { method, dismissed } = useInstallState()
  // Veiledningen husker hvilken variant den ble åpnet med, så den ikke
  // forsvinner under brukeren om tilstanden endrer seg mens den er oppe.
  const [guideFor, setGuideFor] = useState<InstallMethod | null>(null)

  function install() {
    if (method === 'prompt') void promptInstall()
    else if (method !== 'none') setGuideFor(method)
  }

  const close = () => setGuideFor(null)
  const guide =
    guideFor === 'ios-safari' ? <SafariGuide onClose={close} /> : guideFor === 'ios-other' ? <OpenInSafariGuide onClose={close} /> : null

  return { method, dismissed, install, guide }
}

/** Kort på Hjem som tilbyr å installere appen når den er åpnet i en nettleser. */
export function InstallCard() {
  const { method, dismissed, install, guide } = useInstallApp()

  if (method === 'none' || dismissed) return guide

  return (
    <>
      <div className="ha-card install-card">
        <img className="install-icon" src="/icons/icon-192.png" alt="" width={44} height={44} />
        <span className="install-text">
          <span className="t-body-lg install-title">Få Hytteappen på hjemskjermen</span>
          <span className="t-caption">Åpner raskere og virker uten nett</span>
        </span>
        <button type="button" className="install-close" aria-label="Lukk" onClick={dismissInstall}>
          <X className="ha-ico" aria-hidden="true" />
        </button>
        <button type="button" className="ha-btn ha-btn-primary ha-btn-block install-cta" onClick={install}>
          {method === 'prompt' ? 'Installer' : 'Vis hvordan'}
        </button>
      </div>
      {guide}
    </>
  )
}

function SafariGuide({ onClose }: { onClose: () => void }) {
  return (
    <Sheet label="Legg Hytteappen på hjemskjermen" onClose={onClose}>
      <h2 className="t-heading">Legg Hytteappen på hjemskjermen</h2>
      <ol className="install-steps">
        <li>
          <span className="install-step-icon" aria-hidden="true">
            <Share className="ha-ico" />
          </span>
          <span>
            Trykk på <strong>Del</strong>-ikonet i Safari. Ser du det ikke, trykk på <strong>···</strong> først.
          </span>
        </li>
        <li>
          <span className="install-step-icon" aria-hidden="true">
            <SquarePlus className="ha-ico" />
          </span>
          <span>
            Rull ned i menyen og velg <strong>Legg til på Hjem-skjerm</strong>.
          </span>
        </li>
        <li>
          <span className="install-step-icon" aria-hidden="true">
            3
          </span>
          <span>
            Trykk <strong>Legg til</strong> øverst til høyre.
          </span>
        </li>
      </ol>
      <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={onClose}>
        Skjønner
      </button>
    </Sheet>
  )
}

function OpenInSafariGuide({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
    } catch {
      // Uten tilgang til utklippstavlen må adressen kopieres for hånd.
    }
  }

  return (
    <Sheet label="Åpne Hytteappen i Safari" onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="t-heading">Åpne Hytteappen i Safari</h2>
        <p className="muted">
          På iPhone og iPad kan appen bare legges på hjemskjermen fra Safari. Kopier lenken, åpne Safari og lim den inn i
          adressefeltet.
        </p>
      </div>
      <p className="install-url">{window.location.host}</p>
      <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={copyLink}>
        {copied ? 'Kopiert' : 'Kopier lenke'}
      </button>
      <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose}>
        Lukk
      </button>
    </Sheet>
  )
}
