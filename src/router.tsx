import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireAuth, RequireCabin } from './components/Guards'
import { Placeholder } from './components/Placeholder'
import { ForgotPassword } from './screens/auth/ForgotPassword'
import { Login } from './screens/auth/Login'
import { NewPassword } from './screens/auth/NewPassword'
import { Signup } from './screens/auth/Signup'
import { CreateCabin } from './screens/cabins/CreateCabin'
import { Join } from './screens/cabins/Join'
import { JoinHelp } from './screens/cabins/JoinHelp'
import { Members } from './screens/cabins/Members'
import { MyCabins } from './screens/cabins/MyCabins'
import { NoCabin } from './screens/cabins/NoCabin'
import { Home } from './screens/Home'
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

  // Invitasjonslenken virker både for nye og innloggede brukere.
  { path: '/bli-med/:token', element: <Join /> },

  // Innlogget, utenfor en hytte
  { path: '/ingen-hytte', element: <RequireAuth><NoCabin /></RequireAuth> },
  { path: '/opprett-hytte', element: <RequireAuth><CreateCabin /></RequireAuth> },
  { path: '/bli-med', element: <RequireAuth><JoinHelp /></RequireAuth> },

  // Inne i en hytte, med bunnmeny
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireCabin>
          <AppLayout />
        </RequireCabin>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: 'gjoremal', element: <Placeholder title="Gjøremål" step={5} /> },
      { path: 'feil', element: <Placeholder title="Feil og mangler" step={5} /> },
      { path: 'handleliste', element: <Placeholder title="Handleliste" step={5} /> },
      { path: 'mer', element: <More /> },
      { path: 'mer/dokumenter', element: <Placeholder title="Dokumenter og manualer" step={6} backTo="/mer" /> },
      { path: 'mer/info', element: <Placeholder title="Info og koder" step={6} backTo="/mer" /> },
      { path: 'mer/sjekkliste', element: <Placeholder title="Sjekklister" step={6} backTo="/mer" /> },
      { path: 'mer/medlemmer', element: <Members /> },
      { path: 'mer/hytter', element: <MyCabins /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
