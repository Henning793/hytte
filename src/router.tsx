import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { Placeholder } from './components/Placeholder'
import { More } from './screens/More'
import { Welcome } from './screens/Welcome'

// Stiene er på norsk fordi de vises i adressefeltet og i invitasjonslenker.
export const router = createBrowserRouter([
  // Uten innlogging / uten hytte
  { path: '/velkommen', element: <Welcome /> },
  { path: '/opprett-bruker', element: <Placeholder title="Opprett bruker" step={3} backTo="/velkommen" /> },
  { path: '/logg-inn', element: <Placeholder title="Logg inn" step={3} backTo="/velkommen" /> },
  { path: '/glemt-passord', element: <Placeholder title="Glemt passord" step={3} backTo="/logg-inn" /> },
  { path: '/nytt-passord', element: <Placeholder title="Nytt passord" step={3} backTo="/logg-inn" /> },
  { path: '/ingen-hytte', element: <Placeholder title="Ingen hytte ennå" step={4} /> },
  { path: '/bli-med/:token', element: <Placeholder title="Bli med" step={4} /> },

  // Inne i en hytte, med bunnmeny
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Placeholder title="Hjem" step={5} /> },
      { path: 'gjoremal', element: <Placeholder title="Gjøremål" step={5} /> },
      { path: 'feil', element: <Placeholder title="Feil og mangler" step={5} /> },
      { path: 'handleliste', element: <Placeholder title="Handleliste" step={5} /> },
      { path: 'mer', element: <More /> },
      { path: 'mer/dokumenter', element: <Placeholder title="Dokumenter og manualer" step={6} backTo="/mer" /> },
      { path: 'mer/info', element: <Placeholder title="Info og koder" step={6} backTo="/mer" /> },
      { path: 'mer/sjekkliste', element: <Placeholder title="Sjekklister" step={6} backTo="/mer" /> },
      { path: 'mer/medlemmer', element: <Placeholder title="Medlemmer" step={4} backTo="/mer" /> },
      { path: 'mer/hytter', element: <Placeholder title="Mine hytter" step={4} backTo="/mer" /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
