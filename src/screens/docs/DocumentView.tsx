import { useNavigate, useParams } from 'react-router'
import { Download, ExternalLink } from 'lucide-react'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { docMeta, isPdf, onlyDeleter } from '../../lib/content'
import { deleteRows, useTable } from '../../lib/data'
import { downloadUrl, removeFile, useSignedUrl } from '../../lib/files'
import { useNames } from '../../lib/members'
import type { Doc } from '../../lib/types'
import { useMe } from '../../lib/useMe'

export function DocumentView() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const { rows } = useTable<Doc>('documents', cabin.id)
  const name = useNames(cabin.id)
  const doc = rows?.find((d) => d.id === id)
  const url = useSignedUrl(doc?.file_path)

  const top = <TopBar backTo="/mer/dokumenter" backLabel="Dokumenter" />
  if (!rows) return top
  if (!doc) {
    return (
      <>
        {top}
        <div className="scroll">
          <p className="empty">Dokumentet finnes ikke lenger.</p>
        </div>
      </>
    )
  }

  const pdf = isPdf(doc)
  const canDelete = doc.created_by === me || cabin.role === 'admin'

  async function download(d: Doc) {
    const ext = d.file_path.split('.').pop()
    const link = await downloadUrl(d.file_path, `${d.name}.${ext}`)
    if (!link) return toast('Filen ble ikke lastet ned. Sjekk at du har nett.')
    // En vanlig lenke med download-navn; iPhone og Android lagrer den i Filer/Nedlastinger.
    const a = document.createElement('a')
    a.href = link
    a.rel = 'noopener'
    document.body.append(a)
    a.click()
    a.remove()
  }

  async function remove(d: Doc) {
    navigate('/mer/dokumenter', { replace: true })
    try {
      await deleteRows<Doc>('documents', cabin.id, [d.id])
      void removeFile(d.file_path)
      toast('Dokumentet er slettet')
    } catch {
      toast('Dokumentet ble ikke slettet. Sjekk at du har nett.')
    }
  }

  return (
    <>
      {top}
      <div className="scroll">
        <div className="stack" style={{ gap: 4 }}>
          <h1 className="t-title">{doc.name}</h1>
          <p className="t-caption">
            {pdf ? 'PDF' : 'Bilde'} · {docMeta(doc, name)}
          </p>
        </div>
        {pdf ? (
          // PDF-er vises i nettleserens egen visning, som kan zoome og bla.
          <a
            className="ha-btn ha-btn-primary ha-btn-block"
            href={url ?? undefined}
            target="_blank"
            rel="noopener"
            aria-disabled={!url}
          >
            <ExternalLink className="ha-ico" aria-hidden="true" />
            Åpne PDF
          </a>
        ) : (
          <div className="photo">{url ? <img src={url} alt={doc.name} /> : <div style={{ height: 240 }} />}</div>
        )}
        <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={() => download(doc)}>
          <Download className="ha-ico" aria-hidden="true" />
          Last ned
        </button>
        {canDelete ? (
          <button type="button" className="ha-btn ha-btn-danger ha-btn-block" onClick={() => remove(doc)}>
            Slett dokumentet
          </button>
        ) : (
          <p className="t-caption center">Bare {onlyDeleter(name(doc.created_by))} kan slette dette dokumentet.</p>
        )}
      </div>
    </>
  )
}
