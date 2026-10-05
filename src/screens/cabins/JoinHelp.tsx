import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Field } from '../../components/Field'
import { TopBar } from '../../components/TopBar'
import { parseInviteLink } from '../../lib/invite'

const canPaste = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)

/** «Jeg har fått en invitasjonslenke»: lim inn lenken hvis SMS-lenken ikke virker. */
export function JoinHelp() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()

  function go(value: string) {
    const token = parseInviteLink(value)
    if (!token) {
      setError('Det ser ikke ut som en invitasjonslenke. Lim inn hele lenken fra SMS-en.')
      return
    }
    navigate(`/bli-med/${token}`)
  }

  async function paste() {
    try {
      const value = await navigator.clipboard.readText()
      setText(value)
      setError(undefined)
    } catch {
      setError('Fikk ikke lest utklippstavlen. Trykk lenge i feltet og velg «Lim inn».')
    }
  }

  return (
    <main className="screen">
      <TopBar />
      <form
        className="scroll"
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          go(text)
        }}
      >
        <div className="stack">
          <h1 className="t-title">Bli med via lenke</h1>
          <p className="muted">
            Det enkleste er å trykke på lenken i SMS-en du fikk. Fungerer ikke det, kan du lime den inn her.
          </p>
        </div>
        <Field
          label="Invitasjonslenke"
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          hint={`Ser ut som ${window.location.host}/bli-med/…`}
          value={text}
          error={error}
          onChange={(e) => {
            setText(e.target.value)
            setError(undefined)
          }}
        />
        <div className="stack">
          {canPaste && (
            <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={paste}>
              Lim inn fra utklippstavlen
            </button>
          )}
          <button type="submit" className="ha-btn ha-btn-primary ha-btn-block">
            Fortsett
          </button>
        </div>
      </form>
    </main>
  )
}
