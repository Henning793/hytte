import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  CloudOff,
  DoorOpen,
  KeyRound,
  LogOut,
  Play,
  Ship,
  ShoppingCart,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useInstallApp } from '../components/InstallApp'
import { TopBar } from '../components/TopBar'
import { replayIntro } from '../lib/intro'

export function Tips() {
  return (
    <>
      <TopBar backTo="/mer" backLabel="Mer" />
      <div className="scroll">
        <div className="stack">
          <h1 className="t-title">Tips og triks</h1>
          <p className="muted">Det viktigste i appen, kort fortalt.</p>
          <button type="button" className="ha-btn ha-btn-secondary ha-btn-block" onClick={replayIntro}>
            <Play className="ha-ico" aria-hidden="true" />
            Se introen på nytt
          </button>
        </div>

        <div className="stack">
          <InstallTip />

          <Tip icon={CloudOff} title="Uten nett på hytta">
            Alt du har åpnet før, kan leses uten dekning. Det du legger inn eller krysser av, får «Venter på nett» og
            sendes av seg selv når du får dekning igjen. Åpne appen hjemme før du drar, så har den det nyeste.
          </Tip>

          <Tip icon={Camera} title="Meld feil med bilde" to="/oppgaver/ny" state={{ kind: 'feil' }} link="Meld feil">
            Trykk «Noe som mangler eller må fikses?» på Hjem og velg «Noe er ødelagt». Ta bilde, skriv hva det gjelder,
            og send. De andre får varsel om de har slått det på.
          </Tip>

          <Tip icon={ShoppingCart} title="Handlelista" to="/handleliste" link="Gå til handlelista">
            Skriv varen øverst og trykk «Legg til». Kryss av når du har kjøpt den, så ser alle hvem som kjøpte. Alle kan
            rydde bort kjøpte varer.
          </Tip>

          <Tip icon={DoorOpen} title="Sjekklister ved ankomst og avreise" to="/mer/sjekkliste" link="Gå til sjekklistene">
            Kryss av punktene når du kommer og drar. Avkryssingen er bare din, så flere kan bruke lista samtidig. Trykk
            «Ferdig» når alt er gjort.
          </Tip>

          <Tip icon={KeyRound} title="Koder og praktisk info" to="/mer/info" link="Gå til info og koder">
            Under Info og koder finner du wifi, nøkkelboks, søppeltømming og nødnumre. Koden til nøkkelboksen er skjult
            til du trykker «Vis kode».
          </Tip>

          <Tip icon={Ship} title="Fergetider" to="/ferge" link="Gå til fergetidene">
            Velg bryggene én gang, så viser Hjem neste ferge begge veier. Trykk på kortet for alle avgangene i dag.
          </Tip>

          <Tip icon={CalendarDays} title="Kalender" to="/kalender" link="Gå til kalenderen">
            Trykk «Jeg er på hytta» når du skal dit, så ser de andre det. Dugnader og andre hendelser legger du inn med
            «Ny hendelse».
          </Tip>

          <Tip icon={Users} title="Invitere og bytte hytte" to="/mer/medlemmer" link="Gå til medlemmer">
            Den som opprettet hytta, inviterer under Medlemmer. Invitasjonslenken virker i 24 timer. Er du med i flere
            hytter, trykker du på hyttenavnet øverst på Hjem for å bytte.
          </Tip>

          <Tip icon={Bell} title="Varsler" to="/mer/varsler" link="Gå til varsler">
            Velg selv hva du vil få varsel om, for eksempel nye feil og dagen før dugnad. På iPhone må appen ligge på
            hjemskjermen før varsler kan slås på.
          </Tip>

          <Tip icon={LogOut} title="Logge ut">
            «Logg ut» ligger nederst under Mer. Endringer som ikke er sendt ennå, slettes fra telefonen når du logger
            ut, så vent til du har nett.
          </Tip>
        </div>
      </div>
    </>
  )
}

type TipProps = {
  icon: LucideIcon
  title: string
  children: ReactNode
  to?: string
  state?: unknown
  link?: string
  action?: ReactNode
}

function Tip({ icon: Icon, title, children, to, state, link, action }: TipProps) {
  const navigate = useNavigate()
  return (
    <section className="ha-card tip">
      <h2 className="tip-head t-heading">
        <span className="tip-ico" aria-hidden="true">
          <Icon className="ha-ico" />
        </span>
        {title}
      </h2>
      <p>{children}</p>
      {to && link && (
        <button type="button" className="ha-btn ha-btn-ghost" onClick={() => navigate(to, { state })}>
          {link}
          <ChevronRight className="ha-ico" aria-hidden="true" />
        </button>
      )}
      {action}
    </section>
  )
}

/** Hjemskjermen: knapp når nettleseren kan installere, ellers en kort forklaring. */
function InstallTip() {
  const { method, install, guide } = useInstallApp()
  const installed = window.matchMedia('(display-mode: standalone)').matches
  return (
    <Tip
      icon={Smartphone}
      title="Legg appen på hjemskjermen"
      action={
        method !== 'none' && (
          <>
            <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={install}>
              {method === 'prompt' ? 'Installer appen' : 'Vis hvordan'}
            </button>
            {guide}
          </>
        )
      }
    >
      {installed
        ? 'Appen ligger allerede på hjemskjermen. Der åpner den raskere, virker uten nett og kan sende varsler.'
        : 'Da åpner den raskere, virker uten nett og kan sende varsler. På iPhone: trykk Del i Safari og velg «Legg til på Hjem-skjerm». På Android: åpne menyen i Chrome og velg «Installer app».'}
    </Tip>
  )
}
