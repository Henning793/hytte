import { TopBar } from './TopBar'

type Props = {
  title: string
  /** Hvilket byggesteg skjermen kommer i (se docs/HANDOVER.md, avsnitt 9). */
  step: number
  backTo?: string
}

/** Midlertidig skjerm til den ekte er bygget. */
export function Placeholder({ title, step, backTo }: Props) {
  return (
    <div className="screen">
      {backTo !== undefined && <TopBar backTo={backTo} />}
      <div className="scroll">
        <h1 className="t-title">{title}</h1>
        <p className="empty">Denne skjermen kommer i steg {step}.</p>
      </div>
    </div>
  )
}
