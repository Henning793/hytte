import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireAuth } from './components/Guards'
import { Placeholder } from './components/Placeholder'
import { ForgotPassword } from './screens/auth/ForgotPassword'
import { Login } from './screens/auth/Login'
import { NewPassword } from './screens/auth/NewPassword'
import { Signup } from './screens/auth/Signup'
import { More } from './screens/More'
import { Welcome } from './screens/Welcome'

// Stiene er på norsk fordi de vises i adressefeltet og i invitasjonslenker.
export const router = createBrowserRouter([
  // Uten innlogging
  { path: '/velkommen', element: <GuestOnly><Welcome /></GuestOnly> },
  { path: '/opprett-bruker', element: <GuestOnly><Signup /></GuestOnly> },
  { path: '/logg-inn', element: <GuestOnly><Login /></GuestOnly> },
  { path: '/glemt-passord', element: <GuestOnly><ForgotPassword /></GuestOnly> },
  // Fra lenken i e-posten; innlogget med en midlertidig sesjon.
  { path: '/nytt-passord', element: <NewPassword /> },

  // Innlogget, men uten hytte
  { path: '/ingen-hytte', element: <RequireAuth><Placeholder title="Ingen hytte ennå" step={4} /></RequireAuth> },
  { path: '/bli-med/:token', element: <RequireAuth><Placeholder title="Bli med" step={4} /></RequireAuth> },

  // Inne i en hytte, med bunnmeny
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
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
