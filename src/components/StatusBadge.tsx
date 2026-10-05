import { CircleAlert, CircleCheck, Hourglass } from 'lucide-react'
import { statusLabel } from '../lib/content'
import type { IssueStatus } from '../lib/types'

const icons = { ny: CircleAlert, pagar: Hourglass, fikset: CircleCheck }

/** Status på feil vises alltid med ord og ikon, ikke bare farge. */
export function StatusBadge({ status }: { status: IssueStatus }) {
  const Icon = icons[status]
  return (
    <span className={`ha-badge ha-badge-${status}`}>
      <Icon className="ha-ico" aria-hidden="true" />
      {statusLabel[status]}
    </span>
  )
}
