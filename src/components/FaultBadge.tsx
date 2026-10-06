import { CircleAlert } from 'lucide-react'

/** Merker oppgaver som gjelder noe som er ødelagt. Med ord og ikon, ikke bare farge. */
export function FaultBadge() {
  return (
    <span className="ha-badge ha-badge-ny">
      <CircleAlert className="ha-ico" aria-hidden="true" />
      Feil
    </span>
  )
}
