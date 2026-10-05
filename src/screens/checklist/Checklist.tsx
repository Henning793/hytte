import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Check, Trash2 } from 'lucide-react'
import { CheckBox } from '../../components/CheckBox'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { logRun, useRuns, useTicks } from '../../lib/checklist'
import { deleteRows, insertRow, useTable } from '../../lib/data'
import { formatDay } from '../../lib/format'
import { useNames } from '../../lib/members'
import { draftMeta, type ChecklistItem, type ChecklistKind } from '../../lib/types'
import { useMe } from '../../lib/useMe'

const kindLabel: Record<ChecklistKind, string> = { ankomst: 'Ankomst', avreise: 'Avreise' }

export function Checklist() {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const kind: ChecklistKind = params.get('liste') === 'avreise' ? 'avreise' : 'ankomst'
  const { rows } = useTable<ChecklistItem>('checklist_items', cabin.id)
  const runs = useRuns(cabin.id)
  const name = useNames(cabin.id)
  const { ticks, toggle, reset } = useTicks(cabin.id, kind)
  const isAdmin = cabin.role === 'admin'
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)

  const items = (rows ?? []).filter((i) => i.kind === kind).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  // Punkter som er fjernet siden sist teller ikke.
  const done = items.filter((i) => ticks.includes(i.id)).length
  const allDone = items.length > 0 && done === items.length
  const last = runs?.find((r) => r.kind === kind)

  async function finish() {
    setBusy(true)
    try {
      await logRun(cabin.id, kind, me)
      reset()
      toast(kind === 'avreise' ? 'Avreise registrert. God tur hjem!' : 'Ankomst registrert. God tur!')
      navigate('/')
    } catch {
      setBusy(false)
      toast('Gjennomgangen ble ikke lagret. Prøv igjen.')
    }
  }

  function add(ev: FormEvent) {
    ev.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    setHint('')
    const position = Math.max(0, ...items.map((i) => i.position)) + 1
    insertRow<ChecklistItem>('checklist_items', { ...draftMeta(cabin.id, me), kind, text: t, hint: hint.trim() || null, position }).catch(() =>
      toast(`«${t}» ble ikke lagt til. Prøv igjen.`),
    )
  }

  function remove(item: ChecklistItem) {
    deleteRows('checklist_items', cabin.id, [item.id]).then(
      () => toast(`«${item.text}» er fjernet`),
      () => toast('Punktet ble ikke fjernet. Prøv igjen.'),
    )
  }

  return (
    <>
      <TopBar backLabel="Tilbake" />
      <div className="scroll">
        <h1 className="t-title">Sjekkliste</h1>
        <Segmented<ChecklistKind>
          label="Velg liste"
          value={kind}
          options={[
            { value: 'ankomst', label: 'Ankomst' },
            { value: 'avreise', label: 'Avreise' },
          ]}
          onChange={(k) => {
            setEditing(false)
            setParams(k === 'ankomst' ? {} : { liste: k }, { replace: true })
          }}
        />
        {last && (
          <p className="t-caption">
            {kindLabel[kind]} sist fullført av {name(last.completed_by)}, {formatDay(last.completed_at)}.
          </p>
        )}

        {items.length > 0 && !editing && (
          <>
            <div className="stack" style={{ gap: 8 }}>
              <span className="ha-label">
                {done} av {items.length} krysset av
              </span>
              <div className="progress" role="progressbar" aria-label="Fremdrift" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
                <div style={{ width: `${(done / items.length) * 100}%` }} />
              </div>
            </div>
            <div className="ha-list">
              {items.map((i) => (
                <button key={i.id} type="button" className="ha-check" role="checkbox" aria-checked={ticks.includes(i.id)} onClick={() => toggle(i.id)}>
                  <CheckBox />
                  <span className="ha-li-main">
                    <span className="ha-li-title">{i.text}</span>
                    {i.hint && <span className="ha-li-meta">{i.hint}</span>}
                  </span>
                </button>
              ))}
            </div>
            {allDone && (
              <>
                <div className="done-card" role="status">
                  <Check className="ha-ico" aria-hidden="true" />
                  <div className="stack" style={{ gap: 4 }}>
                    <strong style={{ fontSize: 19 }}>{kind === 'avreise' ? 'Alt er klart. God tur hjem!' : 'Hytta er klar. God tur!'}</strong>
                    <span>{kind === 'avreise' ? 'De andre ser at hytta er låst og stengt.' : 'Listen nullstilles når du trykker Ferdig.'}</span>
                  </div>
                </div>
                <button type="button" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy} onClick={finish}>
                  Ferdig
                </button>
              </>
            )}
          </>
        )}

        {editing && (
          <div className="ha-list">
            {items.map((i) => (
              <div key={i.id} className="ha-li">
                <span className="ha-li-main">
                  <span className="ha-li-title">{i.text}</span>
                  {i.hint && <span className="ha-li-meta">{i.hint}</span>}
                </span>
                <button type="button" className="mini-btn" aria-label={`Fjern «${i.text}»`} onClick={() => remove(i)}>
                  <Trash2 className="ha-ico" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {rows && items.length === 0 && (
          <div className="empty">{isAdmin ? 'Ingen punkter ennå. Legg til de faste punktene under.' : 'Admin har ikke lagt inn punkter ennå.'}</div>
        )}

        {isAdmin && rows && (
          <div className="stack">
            <div className="sec-h">
              <h2 className="list-h">Faste punkter (bare admin)</h2>
              {items.length > 0 && (
                <button type="button" className="ha-btn ha-btn-ghost" style={{ minHeight: 44, padding: '0 4px', whiteSpace: 'nowrap' }} onClick={() => setEditing((e) => !e)}>
                  {editing ? 'Ferdig' : 'Fjern punkter'}
                </button>
              )}
            </div>
            <form className="stack" style={{ gap: 8 }} onSubmit={add}>
              <div className="quickadd">
                <label htmlFor="ck-add" className="sr-only">
                  Nytt punkt
                </label>
                <input id="ck-add" className="ha-input" type="text" placeholder="F.eks. Lås uthuset" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} />
                <button type="submit" className="ha-btn ha-btn-secondary">
                  Legg til
                </button>
              </div>
              <label htmlFor="ck-hint" className="sr-only">
                Hint (valgfritt)
              </label>
              <input id="ck-hint" className="ha-input" type="text" placeholder="Hint, valgfritt (f.eks. Nøkkelen henger i gangen)" maxLength={200} value={hint} onChange={(e) => setHint(e.target.value)} />
            </form>
          </div>
        )}
      </div>
    </>
  )
}
