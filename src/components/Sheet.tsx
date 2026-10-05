import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  label: string
  onClose: () => void
  children: ReactNode
}

/** Bunnark som glir opp over innholdet. Lukkes med bakgrunnen eller Esc. */
export function Sheet({ label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Siste onClose, så effekten under bare kjører når arket åpnes og lukkes.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
      // Tab blir i arket, så tastaturbrukere ikke havner bak det.
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([tabindex="-1"]), select, textarea')
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [])

  return (
    <div className="overlay">
      <button type="button" className="scrim" aria-label="Lukk" onClick={onClose} />
      <div className="ha-sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        <div className="ha-grab" />
        {children}
      </div>
    </div>
  )
}
