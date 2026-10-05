import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, ImageIcon, Plus, Search } from 'lucide-react'
import { PendingMark } from '../../components/OfflineBanner'
import { TopBar } from '../../components/TopBar'
import { useCurrentCabin } from '../../lib/cabins'
import { formatFullDay } from '../../lib/dates'
import { usePendingIds, useTable } from '../../lib/data'
import { historyItems, matches, type HistoryItem } from '../../lib/history'
import { useNames } from '../../lib/members'
import type { HistoryEntry, Issue, Task } from '../../lib/types'

export function History() {
  const cabin = useCurrentCabin()
  const entries = useTable<HistoryEntry>('history_entries', cabin.id).rows
  const tasks = useTable<Task>('tasks', cabin.id).rows
  const issues = useTable<Issue>('issues', cabin.id).rows
  const name = useNames(cabin.id)
  const pending = usePendingIds()
  const [query, setQuery] = useState('')

  const all = historyItems(entries, tasks, issues)
  const shown = all.filter((i) => matches(i, query))
  const years = [...new Set(shown.map((i) => i.date.slice(0, 4)))]
  const loaded = entries && tasks && issues

  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="t-title">Historikk</h1>
          <p className="t-caption">Når ting sist ble gjort på hytta. Fullførte gjøremål og fiksede feil kommer med av seg selv.</p>
        </div>
        <Link className="ha-btn ha-btn-primary ha-btn-block" to="/mer/historikk/ny">
          <Plus className="ha-ico" aria-hidden="true" />
          Legg til i historikken
        </Link>
        {all.length > 0 && (
          <div className="search">
            <Search className="ha-ico" aria-hidden="true" />
            <label htmlFor="hist-search" className="sr-only">
              Søk i historikken
            </label>
            <input
              id="hist-search"
              className="ha-input"
              type="search"
              placeholder="Søk, for eksempel «maling»"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        {loaded && all.length === 0 && (
          <div className="empty">Ingenting her ennå. Legg inn det dere husker, for eksempel når hytta sist ble malt.</div>
        )}
        {all.length > 0 && shown.length === 0 && <div className="empty">Fant ingenting om «{query.trim()}».</div>}
        {years.map((year) => (
          <section key={year} className="stack" aria-label={year}>
            <h2 className="list-h">{year}</h2>
            <div className="ha-list">
              {shown
                .filter((i) => i.date.startsWith(year))
                .map((i) => (
                  <Row key={`${i.type}-${i.id}`} item={i} by={i.by ? name(i.by) : ''} pending={pending.has(i.id)} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

const label: Record<HistoryItem['type'], string | null> = { entry: null, task: null, issue: 'Feil fikset' }

function Row({ item, by, pending }: { item: HistoryItem; by: string; pending: boolean }) {
  const to = item.type === 'entry' ? `/mer/historikk/${item.id}` : item.type === 'task' ? `/gjoremal/${item.id}` : `/feil/${item.id}`
  const badge = item.type === 'task' ? (item.row.kind === 'vedlikehold' ? 'Vedlikehold' : 'Gjøremål') : label[item.type]
  const photo = item.type === 'entry' ? item.row.photo_path : item.type === 'issue' ? item.row.photo_path : null
  return (
    <Link className="ha-li" to={to}>
      <span className="ha-li-main">
        <span className="ha-li-title">{item.title}</span>
        <span className="ha-li-meta">
          <PendingMark show={pending} />
          {formatFullDay(item.date)}
          {by ? ` · ${by}` : ''}
          {badge && <span className="ha-badge ha-badge-neutral">{badge}</span>}
          {photo && <ImageIcon className="ha-ico ico-sm" aria-label="Har bilde" />}
        </span>
      </span>
      <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
    </Link>
  )
}
