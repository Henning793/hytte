import { useId, useState, type InputHTMLAttributes } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  error?: string
}

export function FieldError({ id, message }: { id?: string; message: string }) {
  return (
    <div className="ha-error" role="alert" id={id}>
      <AlertCircle className="ha-ico" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

/** Tekstfelt med etikett, hjelpetekst og feilmelding under. */
export function Field({ label, hint, error, ...input }: Props) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={error ? 'ha-field is-error' : 'ha-field'}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="ha-input" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {hint && (
        <span className="ha-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  )
}

/** Passordfelt med øye-knapp («Vis passord» / «Skjul passord»). */
export function PasswordField({ label, hint, error, ...input }: Props) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className={error ? 'ha-field is-error' : 'ha-field'}>
      <label htmlFor={id}>{label}</label>
      <div className="ha-input-wrap">
        <input
          id={id}
          className="ha-input"
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...input}
        />
        <button
          type="button"
          className="ha-eye"
          aria-label={visible ? 'Skjul passord' : 'Vis passord'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="ha-ico" aria-hidden="true" /> : <Eye className="ha-ico" aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <span className="ha-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  )
}
