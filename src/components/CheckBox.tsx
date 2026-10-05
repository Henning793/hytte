import { Check } from 'lucide-react'

/** Avkrysningsboksen i en rad (selve boksen; raden rundt er trykkflaten). */
export function CheckBox() {
  return (
    <span className="ha-box">
      <Check className="ha-ico" aria-hidden="true" />
    </span>
  )
}
