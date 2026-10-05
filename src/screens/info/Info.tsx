import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Pencil } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { useCabinInfo } from '../../lib/info'

const emergency = [
  { label: 'Brann', number: '110' },
  { label: 'Politi', number: '112' },
  { label: 'Ambulanse', number: '113' },
  { label: 'Legevakt', number: '116 117' },
]

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ha-card">
      <h2 className="t-heading">{title}</h2>
      {children}
    </section>
  )
}

const Missing = () => <p className="muted">Ikke lagt inn ennå.</p>

export function Info() {
  const cabin = useCurrentCabin()
  const toast = useToast()
  const { info, loaded } = useCabinInfo(cabin.id)
  const [showCode, setShowCode] = useState(false)

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast('Wifi-passordet er kopiert'),
      () => toast('Kunne ikke kopiere. Hold fingeren på passordet for å kopiere det.'),
    )
  }

  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <div className="sec-h">
          <h1 className="t-title">Info og koder</h1>
          <Link className="mini-btn row" style={{ gap: 6, textDecoration: 'none' }} to="/mer/info/endre">
            <Pencil className="ha-ico" aria-hidden="true" />
            Endre
          </Link>
        </div>
        {loaded && (
          <>
            <Card title="Wifi">
              {info?.wifi_name || info?.wifi_password ? (
                <>
                  {info.wifi_name && (
                    <div className="stack" style={{ gap: 2 }}>
                      <span className="t-caption">Nettverk</span>
                      <span className="t-body-lg">{info.wifi_name}</span>
                    </div>
                  )}
                  {info.wifi_password && (
                    <div className="code-row">
                      <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                        <span className="t-caption">Passord</span>
                        <span className="t-code" style={{ overflowWrap: 'anywhere', userSelect: 'all' }}>
                          {info.wifi_password}
                        </span>
                      </div>
                      <button type="button" className="mini-btn" onClick={() => copy(info.wifi_password!)}>
                        Kopier
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Missing />
              )}
            </Card>
            <Card title="Nøkkelboks">
              {info?.keybox_code && (
                <div className="code-row">
                  <span className="t-code" aria-live="polite">
                    {showCode ? info.keybox_code.split('').join(' ') : <span aria-label="Skjult kode">• • • •</span>}
                  </span>
                  <button type="button" className="mini-btn" aria-pressed={showCode} onClick={() => setShowCode((s) => !s)}>
                    {showCode ? 'Skjul' : 'Vis kode'}
                  </button>
                </div>
              )}
              {info?.keybox_location && <p className="muted" style={{ whiteSpace: 'pre-line' }}>{info.keybox_location}</p>}
              {!info?.keybox_code && !info?.keybox_location && <Missing />}
            </Card>
            <Card title="Søppeltømming">
              {info?.trash_info ? <p style={{ whiteSpace: 'pre-line' }}>{info.trash_info}</p> : <Missing />}
            </Card>
            <Card title="Nærmeste butikk">
              {info?.store_info ? <p style={{ whiteSpace: 'pre-line' }}>{info.store_info}</p> : <Missing />}
            </Card>
            <Card title="Nødnumre">
              <div className="ha-list" style={{ border: 0 }}>
                {emergency.map((e) => (
                  <div key={e.number} className="ha-li" style={{ paddingLeft: 0 }}>
                    <span className="ha-li-main">
                      <span className="ha-li-title">{e.label}</span>
                    </span>
                    <a className="tel" href={`tel:${e.number.replace(/\s/g, '')}`} aria-label={`Ring ${e.label.toLowerCase()}, ${e.number}`}>
                      {e.number}
                    </a>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Greit å vite">
              {info?.notes ? <p style={{ whiteSpace: 'pre-line' }}>{info.notes}</p> : <Missing />}
            </Card>
          </>
        )}
      </div>
    </>
  )
}
