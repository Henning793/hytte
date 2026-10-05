import { CabinSwitcher } from '../components/CabinSwitcher'

export function Home() {
  return (
    <>
      <CabinSwitcher />
      <div className="scroll" style={{ paddingTop: 12 }}>
        <p className="empty">Snarveier, feil, gjøremål og handleliste kommer her i steg 5.</p>
      </div>
    </>
  )
}
