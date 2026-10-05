import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, Upload } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useCurrentCabin } from '../../lib/cabins'
import { categoryLabel, docMeta, isPdf } from '../../lib/content'
import { useTable } from '../../lib/data'
import { useNames } from '../../lib/members'
import type { Doc, DocCategory } from '../../lib/types'
import { UploadSheet } from './UploadSheet'

const categories: DocCategory[] = ['manualer', 'dokumenter']

export function Documents() {
  const cabin = useCurrentCabin()
  const navigate = useNavigate()
  const { rows } = useTable<Doc>('documents', cabin.id)
  const name = useNames(cabin.id)
  const [uploading, setUploading] = useState(false)

  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <h1 className="t-title">Dokumenter og manualer</h1>
        <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={() => setUploading(true)}>
          <Upload className="ha-ico" aria-hidden="true" />
          Last opp
        </button>
        {rows &&
          categories.map((cat) => {
            const docs = rows.filter((d) => d.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'nb'))
            return (
              <div key={cat} className="stack">
                <h2 className="list-h">
                  {categoryLabel[cat]} · {docs.length}
                </h2>
                {docs.length ? (
                  <div className="ha-list">
                    {docs.map((d) => (
                      <button key={d.id} type="button" className="ha-li" onClick={() => navigate(`/mer/dokumenter/${d.id}`)}>
                        <span className={isPdf(d) ? 'doc-type' : 'doc-type img'} aria-hidden="true">
                          {isPdf(d) ? 'PDF' : 'Bilde'}
                        </span>
                        <span className="ha-li-main">
                          <span className="ha-li-title">{d.name}</span>
                          <span className="ha-li-meta">{docMeta(d, name)}</span>
                        </span>
                        <ChevronRight className="ha-ico ha-chev" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty">Ingen dokumenter her ennå.</div>
                )}
              </div>
            )
          })}
      </div>
      {uploading && <UploadSheet onClose={() => setUploading(false)} />}
    </>
  )
}
