import { useId, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Field, FieldError } from '../../components/Field'
import { Segmented } from '../../components/Segmented'
import { TopBar } from '../../components/TopBar'
import { useToast } from '../../components/Toast'
import { useCurrentCabin } from '../../lib/cabins'
import { insertRow, updateRow, useTable } from '../../lib/data'
import { useMembers } from '../../lib/members'
import { draftMeta, type Task, type TaskKind } from '../../lib/types'
import { useMe } from '../../lib/useMe'

/** «Nytt gjøremål» og «Endre gjøremål». */
export function TaskForm() {
  const { id } = useParams()
  const cabin = useCurrentCabin()
  const { rows } = useTable<Task>('tasks', cabin.id)
  const existing = id ? rows?.find((t) => t.id === id) : undefined

  if (id && !rows) return null
  if (id && !existing) return <p className="empty">Fant ikke gjøremålet.</p>
  // key: skjemaet starter på nytt med riktige verdier når gjøremålet er lastet.
  return <TaskFormInner key={existing?.id ?? 'ny'} existing={existing} />
}

function TaskFormInner({ existing }: { existing?: Task }) {
  const cabin = useCurrentCabin()
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const location = useLocation()
  const { rows: members } = useMembers(cabin.id)
  const fieldId = useId()

  const state = location.state as { kind?: TaskKind; back?: string } | null
  const initialKind = state?.kind ?? 'gjoremal'
  const [kind, setKind] = useState<TaskKind>(existing?.kind ?? initialKind)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [responsible, setResponsible] = useState(existing?.responsible_user_id ?? '')
  const [due, setDue] = useState(existing?.due_date ?? '')
  const [error, setError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    if (!title.trim()) {
      setError('Skriv kort hva som skal gjøres.')
      return
    }
    const fields = {
      kind,
      title: title.trim(),
      description: description.trim() || null,
      responsible_user_id: responsible || null,
      due_date: due || null,
    }
    setBusy(true)
    try {
      if (existing) {
        await updateRow<Task>('tasks', cabin.id, existing.id, fields)
        toast('Gjøremålet er endret')
        navigate(`/gjoremal/${existing.id}`, { replace: true })
      } else {
        await insertRow<Task>('tasks', {
          ...draftMeta(cabin.id, me),
          ...fields,
          done: false,
          done_by: null,
          done_at: null,
        })
        toast('Gjøremålet er lagt til')
        // Tilbake til listen med samme filter som før.
        navigate(state?.back ? `/gjoremal?${state.back}` : '/gjoremal', { replace: true })
      }
    } catch {
      setBusy(false)
      setFormError('Gjøremålet ble ikke lagret. Prøv igjen.')
    }
  }

  return (
    <>
      <TopBar backLabel="Avbryt" />
      <form className="scroll" onSubmit={submit} noValidate>
        <h1 className="t-title">{existing ? 'Endre gjøremål' : 'Nytt gjøremål'}</h1>
        <Segmented<TaskKind>
          label="Type"
          value={kind}
          options={[
            { value: 'gjoremal', label: 'Gjøremål' },
            { value: 'vedlikehold', label: 'Vedlikehold' },
          ]}
          onChange={setKind}
        />
        <Field
          label="Hva skal gjøres?"
          value={title}
          maxLength={200}
          error={error}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(undefined)
          }}
        />
        <div className="ha-field">
          <label htmlFor={`${fieldId}-desc`}>
            Beskrivelse <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <textarea
            id={`${fieldId}-desc`}
            className="ha-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-resp`}>
            Ansvarlig <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <select
            id={`${fieldId}-resp`}
            className="ha-input"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          >
            <option value="">Ingen ennå</option>
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_id === me ? `${m.first_name} (meg)` : m.first_name}
              </option>
            ))}
          </select>
        </div>
        <div className="ha-field">
          <label htmlFor={`${fieldId}-due`}>
            Frist <span className="muted" style={{ fontWeight: 400 }}>(valgfritt)</span>
          </label>
          <input
            id={`${fieldId}-due`}
            className="ha-input"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        {formError && <FieldError message={formError} />}
        <button type="submit" className="ha-btn ha-btn-primary ha-btn-block" disabled={busy}>
          {existing ? 'Lagre endringene' : 'Lagre gjøremål'}
        </button>
      </form>
    </>
  )
}
