import type { ReactNode } from 'react'
import { Sheet } from './Sheet'

type Props = {
  /** Spørsmålet, f.eks. «Slette gjøremålet?» */
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

/** «Er du sikker?» før noe slettes. */
export function ConfirmSheet({ title, children, confirmLabel, onConfirm, onClose }: Props) {
  return (
    <Sheet label={title} onClose={onClose}>
      <div className="stack" style={{ gap: 4 }}>
        <h2 className="t-heading">{title}</h2>
        {children && <p className="muted">{children}</p>}
      </div>
      <button
        type="button"
        className="ha-btn ha-btn-danger ha-btn-block"
        onClick={() => {
          onClose()
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose}>
        Avbryt
      </button>
    </Sheet>
  )
}
