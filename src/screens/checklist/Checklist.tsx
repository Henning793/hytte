import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Check, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { CheckBox } from '../../components/CheckBox'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Field } from '../../components/Field'
import { Sheet } from '../../components/Sheet'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { logRun, useRuns, useTicks } from '../../lib/checklist'
import { deleteRows, insertRow, updateRow, useTable } from '../../lib/data'
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
  const [removing, setRemoving] = useState<ChecklistItem | null>(null)
  const [changing, setChanging] = useState<ChecklistItem | null>(null)

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

  // Flytter et punkt ett hakk opp eller ned og nummererer listen på nytt.
  function move(index: number, by: -1 | 1) {
    const order = [...items]
    const [item] = order.splice(index, 1)
    order.splice(index + by, 0, item)
    order.forEach((it, i) => {
      if (it.position !== i + 1) {
        updateRow<ChecklistItem>('checklist_items', cabin.id, it.id, { position: i + 1 }).catch(() => toast('Rekkefølgen ble ikke lagret. Prøv igjen.'))
      }
    })
  }

  const canRemove = (item: ChecklistItem) => isAdmin || item.created_by === me

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
            {items.map((i, idx) => (
              <div key={i.id} className="ha-li">
                <button type="button" className="ha-li-main edit-main" aria-label={`Endre teksten «${i.text}»`} onClick={() => setChanging(i)}>
                  <span className="ha-li-title">
                    {i.text}
                    <Pencil className="edit-pen" aria-hidden="true" />
                  </span>
                  {i.hint && <span className="ha-li-meta">{i.hint}</span>}
                </button>
                <span className="row-actions">
                  <button type="button" className="mini-btn ico-only" aria-label={`Flytt «${i.text}» opp`} disabled={idx === 0} onClick={() => move(idx, -1)}>
                    <ChevronUp className="ha-ico" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="mini-btn ico-only"
                    aria-label={`Flytt «${i.text}» ned`}
                    disabled={idx === items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <ChevronDown className="ha-ico" aria-hidden="true" />
                  </button>
                  {canRemove(i) && (
                    <button type="button" className="mini-btn ico-only" aria-label={`Fjern «${i.text}»`} onClick={() => setRemoving(i)}>
                      <Trash2 className="ha-ico" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        {editing && (
          <p className="t-caption">
            Trykk på et punkt for å endre teksten.
            {!isAdmin && items.some((i) => !canRemove(i)) && ' Du kan fjerne punkter du har lagt inn selv. Admin kan fjerne alle.'}
          </p>
        )}

        {rows && items.length === 0 && (
          <div className="empty">Ingen punkter ennå. Legg til punktene under, så ser alle dem.</div>
        )}

        {rows && (
          <div className="stack">
            <div className="sec-h">
              <h2 className="list-h">Faste punkter</h2>
              {items.length > 0 && (
                <button type="button" className="ha-btn ha-btn-ghost" style={{ minHeight: 44, padding: '0 4px', whiteSpace: 'nowrap' }} onClick={() => setEditing((e) => !e)}>
                  {editing ? 'Ferdig' : 'Endre punkter'}
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
      {changing && <EditItemSheet item={changing} onClose={() => setChanging(null)} />}
      {removing && (
        <ConfirmSheet title={`Fjerne «${removing.text}»?`} confirmLabel="Fjern punktet" onConfirm={() => remove(removing)} onClose={() => setRemoving(null)}>
          Punktet blir borte fra {kind === 'ankomst' ? 'ankomstlisten' : 'avreiselisten'} for alle.
        </ConfirmSheet>
      )}
    </>
  )
}

/** Endre teksten og hintet på et punkt. */
function EditItemSheet({ item, onClose }: { item: ChecklistItem; onClose: () => void }) {
  const toast = useToast()
  const [text, setText] = useState(item.text)
  const [hint, setHint] = useState(item.hint ?? '')
  const [error, setError] = useState<string>()

  function save(ev: FormEvent) {
    ev.preventDefault()
    const t = text.trim()
    if (!t) {
      setError('Skriv hva som skal gjøres.')
      return
    }
    onClose()
    if (t === item.text && (hint.trim() || null) === item.hint) return
    updateRow<ChecklistItem>('checklist_items', item.cabin_id, item.id, { text: t, hint: hint.trim() || null }).then(
      () => toast('Punktet er endret'),
      () => toast('Endringen ble ikke lagret. Prøv igjen.'),
    )
  }

  return (
    <Sheet label="Endre punkt" onClose={onClose}>
      <form className="stack" onSubmit={save} noValidate>
        <h2 className="t-heading">Endre punkt</h2>
        <Field
          label="Punkt"
          value={text}
          maxLength={200}
          error={error}
          onChange={(e) => {
            setText(e.target.value)
            setError(undefined)
          }}
        />
        <Field label="Hint (valgfritt)" value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} />
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block">
          Lagre
        </button>
        <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose}>
          Avbryt
        </button>
      </form>
    </Sheet>
  )
}
