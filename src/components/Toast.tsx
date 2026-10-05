import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'

const ToastContext = createContext<(message: string) => void>(() => {})

/** Kort bekreftelse nederst på skjermen, f.eks. «Velkommen, Kari!». */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(t)
  }, [message])

  const show = useCallback((m: string) => setMessage(m), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {message && (
          <div className="ha-toast">
            <CheckCircle2 className="ha-ico ico-sm" aria-hidden="true" />
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
