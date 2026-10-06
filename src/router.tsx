import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { GuestOnly, RequireAuth, RequireCabin } from './components/Guards'
import { Moved } from './components/Moved'
import { ForgotPassword } from './screens/auth/ForgotPassword'
import { Login } from './screens/auth/Login'
import { NewPassword } from './screens/auth/NewPassword'
import { Signup } from './screens/auth/Signup'
import { Calendar } from './screens/calendar/Calendar'
import { EventForm } from './screens/calendar/EventForm'
import { StayForm } from './screens/calendar/StayForm'
import { Checklist } from './screens/checklist/Checklist'
import { DocumentView } from './screens/docs/DocumentView'
import { Documents } from './screens/docs/Documents'
import { Info } from './screens/info/Info'
import { InfoEdit } from './screens/info/InfoEdit'
import { CreateCabin } from './screens/cabins/CreateCabin'
import { Join } from './screens/cabins/Join'
import { JoinHelp } from './screens/cabins/JoinHelp'
import { Members } from './screens/cabins/Members'
import { MyCabins } from './screens/cabins/MyCabins'
import { NoCabin } from './screens/cabins/NoCabin'
import { History } from './screens/history/History'
import { HistoryDetail } from './screens/history/HistoryDetail'
import { HistoryForm } from './screens/history/HistoryForm'
import { Home } from './screens/Home'
import { More } from './screens/More'
import { Notifications } from './screens/Notifications'
import { Shopping } from './screens/Shopping'
import { TaskDetail } from './screens/tasks/TaskDetail'
import { TaskForm } from './screens/tasks/TaskForm'
import { Tasks } from './screens/tasks/Tasks'
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
      { path: 'oppgaver', element: <Tasks /> },
      { path: 'oppgaver/ny', element: <TaskForm /> },
      { path: 'oppgaver/:id', element: <TaskDetail /> },
      { path: 'oppgaver/:id/endre', element: <TaskForm /> },
      { path: 'kalender', element: <Calendar /> },
      { path: 'kalender/opphold/ny', element: <StayForm /> },
      { path: 'kalender/opphold/:id', element: <StayForm /> },
      { path: 'kalender/hendelse/ny', element: <EventForm /> },
      { path: 'kalender/hendelse/:id', element: <EventForm /> },
      { path: 'handleliste', element: <Shopping /> },
      { path: 'mer', element: <More /> },
      { path: 'mer/dokumenter', element: <Documents /> },
      { path: 'mer/dokumenter/:id', element: <DocumentView /> },
      { path: 'mer/info', element: <Info /> },
      { path: 'mer/info/endre', element: <InfoEdit /> },
      { path: 'mer/sjekkliste', element: <Checklist /> },
      { path: 'mer/historikk', element: <History /> },
      { path: 'mer/historikk/ny', element: <HistoryForm /> },
      { path: 'mer/historikk/:id', element: <HistoryDetail /> },
      { path: 'mer/historikk/:id/endre', element: <HistoryForm /> },
      { path: 'mer/medlemmer', element: <Members /> },
      { path: 'mer/hytter', element: <MyCabins /> },
      { path: 'mer/varsler', element: <Notifications /> },

      // Gamle adresser, fra varsler og bokmerker før feil og gjøremål ble til Oppgaver.
      { path: 'gjoremal/*', element: <Moved from="/gjoremal" to="/oppgaver" /> },
      { path: 'feil/ny', element: <Navigate to="/oppgaver/ny" state={{ kind: 'feil' }} replace /> },
      { path: 'feil/*', element: <Moved from="/feil" to="/oppgaver" /> },
      { path: 'mer/kalender/*', element: <Moved from="/mer/kalender" to="/kalender" /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
