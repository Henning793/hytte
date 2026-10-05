import { useState, type FormEvent } from 'react'
import { CheckBox } from '../components/CheckBox'
import { ConfirmSheet } from '../components/ConfirmSheet'
import { PendingMark } from '../components/OfflineBanner'
import { useToast } from '../components/Toast'
import { useCurrentCabin } from '../lib/cabins'
import { deleteRows, insertRow, updateRow, usePendingIds, useTable } from '../lib/data'
import { count } from '../lib/format'
import { useNames } from '../lib/members'
import { draftMeta, type ShoppingItem } from '../lib/types'
import { useMe } from '../lib/useMe'

export function Shopping() {
  const cabin = useCurrentCabin()
  const me = useMe()
  const toast = useToast()
  const { rows } = useTable<ShoppingItem>('shopping_items', cabin.id)
  const name = useNames(cabin.id)
  const pending = usePendingIds()
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)

  const open = (rows ?? []).filter((i) => !i.done).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const bought = (rows ?? []).filter((i) => i.done).sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? ''))

  function add(ev: FormEvent) {
    ev.preventDefault()
    const itemName = text.trim()
    if (!itemName) return
    setText('')
    insertRow<ShoppingItem>('shopping_items', {
      ...draftMeta(cabin.id, me),
      name: itemName,
      done: false,
      bought_by: null,
      bought_at: null,
    }).catch(() => toast(`«${itemName}» ble ikke lagt til. Prøv igjen.`))
  }

  function toggle(i: ShoppingItem) {
    updateRow<ShoppingItem>('shopping_items', cabin.id, i.id, { done: !i.done }, { bought_by: i.done ? null : me }).catch(() =>
      toast('Endringen ble ikke lagret. Prøv igjen.'),
    )
  }

  function clearBought() {
    deleteRows('shopping_items', cabin.id, bought.map((i) => i.id)).then(
      () => toast('Kjøpte varer er fjernet'),
      () => toast('Noen varer ble ikke fjernet. Prøv igjen.'),
    )
  }

  const item = (i: ShoppingItem) => (
    <button key={i.id} type="button" className="ha-check" role="checkbox" aria-checked={i.done} onClick={() => toggle(i)}>
      <CheckBox />
      <span className="ha-li-main">
        <span className="ha-li-title">{i.name}</span>
        <span className="ha-li-meta">
          <PendingMark show={pending.has(i.id)} />
          {i.done ? `Kjøpt av ${name(i.bought_by)}` : `Lagt til av ${name(i.created_by)}`}
        </span>
      </span>
    </button>
  )

  return (
    <div className="scroll" style={{ paddingTop: 20 }}>
      <div className="sec-h">
        <h1 className="t-title">Handleliste</h1>
        {rows && <span className="t-caption">{count(open.length, 'vare', 'varer')}</span>}
      </div>
      <form className="quickadd" onSubmit={add}>
        <label htmlFor="sh-add" className="sr-only">
          Ny vare
        </label>
        <input
          id="sh-add"
          className="ha-input"
          type="text"
          placeholder="Legg til vare …"
          maxLength={100}
          enterKeyHint="done"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="ha-btn ha-btn-primary">
          Legg til
        </button>
      </form>
      {open.length > 0 && <div className="ha-list">{open.map(item)}</div>}
      {rows && open.length === 0 && <div className="empty">Alt er kjøpt. Skriv en vare over for å legge den til.</div>}
      {bought.length > 0 && (
        <>
          <h2 className="list-h">Kjøpt</h2>
          <div className="ha-list">{bought.map(item)}</div>
          <div>
            <button type="button" className="ha-btn ha-btn-ghost" style={{ paddingLeft: 0 }} onClick={() => setConfirming(true)}>
              Fjern kjøpte varer
            </button>
          </div>
        </>
      )}
      {confirming && (
        <ConfirmSheet
          title={`Fjerne ${count(bought.length, 'kjøpt vare', 'kjøpte varer')}?`}
          confirmLabel="Fjern kjøpte varer"
          onConfirm={clearBought}
          onClose={() => setConfirming(false)}
        >
          De blir borte fra listen for alle.
        </ConfirmSheet>
      )}
    </div>
  )
}
