import { House, Warehouse } from 'lucide-react'
import type { Direction } from '../../lib/ferry'

/** Hytte på ferga mot hytta, hus på ferga hjem. Teksten ved siden av sier det samme. */
export function DirectionIcon({ dir }: { dir: Direction }) {
  const Icon = dir === 'out' ? Warehouse : House
  return <Icon className="ha-ico ferry-dir-ico" aria-hidden="true" />
}
