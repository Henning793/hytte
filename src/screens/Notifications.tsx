import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useToast } from '../components/Toast'
import {
  DEFAULT_PREFS,
  PREF_LABELS,
  disablePush,
  enablePush,
  isIos,
  isStandalone,
  loadPrefs,
  pushSupported,
  savePrefs,
  usePushEnabled,
  type PushPrefs,
} from '../lib/push'
import { useMe } from '../lib/useMe'

export function Notifications() {
  const supported = pushSupported()
  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <h1 className="t-title">Varsler</h1>
        {supported ? <Settings /> : <NotSupported />}
      </div>
    </>
  )
}

function NotSupported() {
  if (isIos() && !isStandalone()) {
    return (
      <div className="ha-card stack">
        <h2 className="t-heading">Legg appen på hjemskjermen først</h2>
        <p>På iPhone og iPad virker varsler bare når appen er lagt til på hjemskjermen.</p>
        <ol className="stack" style={{ paddingLeft: 20, margin: 0 }}>
          <li>Trykk på Del-knappen nederst i Safari.</li>
          <li>Velg «Legg til på Hjem-skjerm».</li>
          <li>Åpne appen fra hjemskjermen og slå på varsler her.</li>
        </ol>
      </div>
    )
  }
  return <p className="muted">Denne nettleseren støtter ikke varsler. Prøv en annen nettleser, eller legg appen til på hjemskjermen.</p>
}

function Settings() {
  const me = useMe()
  const toast = useToast()
  const [enabled, setEnabled] = usePushEnabled()
  const [busy, setBusy] = useState(false)
  const [prefs, setPrefs] = useState<PushPrefs | null>(null)
  const blocked = Notification.permission === 'denied'

  useEffect(() => {
    if (!enabled) return
    let active = true
    loadPrefs().then(
      (p) => active && setPrefs(p),
      () => active && setPrefs(DEFAULT_PREFS),
    )
    return () => {
      active = false
    }
  }, [enabled])

  async function toggle() {
    setBusy(true)
    try {
      if (enabled) {
        await disablePush()
        setEnabled(false)
        toast('Varsler er slått av')
      } else {
        const result = await enablePush()
        if (result === 'on') {
          setEnabled(true)
          toast('Varsler er slått på')
        } else if (result === 'denied') {
          toast('Du må gi appen lov til å sende varsler')
        } else {
          toast('Varsler er ikke satt opp for appen ennå')
        }
      }
    } catch {
      toast('Det gikk ikke. Sjekk nettet og prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  function setPref(key: keyof PushPrefs, value: boolean) {
    if (!prefs) return
    const before = prefs
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    savePrefs(me, next).catch(() => {
      setPrefs(before)
      toast('Valget ble ikke lagret. Sjekk nettet og prøv igjen.')
    })
  }

  return (
    <>
      <div className="ha-list">
        <div className="ha-li">
          <Bell className="ha-ico" aria-hidden="true" />
          <span className="ha-li-main">
            <span className="ha-li-title" id="push-label">
              Varsler på denne enheten
            </span>
            <span className="ha-li-meta">{enabled ? 'På' : 'Av'}</span>
          </span>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={Boolean(enabled)}
            aria-labelledby="push-label"
            disabled={enabled === null || busy || (blocked && !enabled)}
            onClick={toggle}
          />
        </div>
      </div>

      {blocked && !enabled && (
        <p className="muted">
          Varsler er blokkert for appen. Du kan tillate dem i innstillingene på telefonen eller i nettleseren.
        </p>
      )}

      {enabled && prefs && (
        <div className="stack">
          <h2 className="list-h">Varsle meg om</h2>
          <div className="ha-list">
            {PREF_LABELS.map(({ key, label, meta }) => (
              <div key={key} className="ha-li">
                <span className="ha-li-main">
                  <span className="ha-li-title" id={`pref-${key}`}>
                    {label}
                  </span>
                  <span className="ha-li-meta">{meta}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  className="switch"
                  aria-checked={prefs[key]}
                  aria-labelledby={`pref-${key}`}
                  onClick={() => setPref(key, !prefs[key])}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="muted">
        Du får aldri varsel om noe du har gjort selv. Valgene gjelder alle hyttene dine. Varsler må slås på for hver
        telefon eller PC du bruker.
      </p>
    </>
  )
}
