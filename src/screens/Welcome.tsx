import { Link, useLocation } from 'react-router'

export function Welcome() {
  // Husk hvor brukeren skulle (f.eks. en invitasjonslenke) gjennom innloggingen.
  const { state } = useLocation()
  return (
    <main className="screen">
      <div className="scroll" style={{ justifyContent: 'space-between', paddingTop: 40 }}>
        <div className="stack-lg">
          <div className="welcome-art">
            <svg viewBox="0 0 120 80" aria-hidden="true">
              <rect width="120" height="80" fill="#cddbe0" />
              <path d="M0 52 Q30 34 60 46 T120 40 V80 H0z" fill="#8fae86" />
              <path d="M0 62 Q40 50 80 58 T120 56 V80 H0z" fill="#6c8c64" />
              <path d="M44 46 L62 34 L80 46 Z" fill="#4a5a3a" />
              <rect x="47" y="46" width="30" height="18" fill="#5a3b2a" />
              <rect x="58" y="52" width="7" height="12" fill="#2b1d14" />
              <rect x="68" y="50" width="6" height="5" fill="#f3d27a" />
              <path d="M18 64 L24 44 L30 64Z" fill="#2f4d3a" />
              <path d="M90 64 L97 40 L104 64Z" fill="#2f4d3a" />
              <path d="M100 66 L105 50 L110 66Z" fill="#3b5d47" />
              <circle cx="98" cy="18" r="7" fill="#e2ad5b" />
            </svg>
          </div>
          <h1 className="t-display">Velkommen til Hytteappen</h1>
          <p className="t-body-lg muted">
            Oppgaver, handleliste, kalender og koder – samlet på ett sted for alle som deler hytta.
          </p>
        </div>
        <div className="stack">
          <Link className="ha-btn ha-btn-primary ha-btn-block" to="/opprett-bruker" state={state}>
            Opprett bruker
          </Link>
          <Link className="ha-btn ha-btn-secondary ha-btn-block" to="/logg-inn" state={state}>
            Logg inn
          </Link>
        </div>
      </div>
    </main>
  )
}
