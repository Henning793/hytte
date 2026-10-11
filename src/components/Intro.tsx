import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Bell, Check, ChevronRight, Clock, CloudOff, Ship, Upload, Wrench } from 'lucide-react'
import { DirectionIcon } from '../screens/ferry/DirectionIcon'
import { FaultBadge } from './FaultBadge'

type Scene = { title: string; text: string; art: () => ReactNode }

const scenes: Scene[] = [
  {
    title: 'Meld feil med bilde',
    text: 'Ta bilde av det som er ødelagt. Alle på hytta ser det med en gang og får varsel.',
    art: FaultArt,
  },
  {
    title: 'Felles handleliste',
    text: 'Skriv det som mangler. Den som handler krysser av, så vet alle hva som er kjøpt.',
    art: ShoppingArt,
  },
  {
    title: 'Neste ferge på Hjem',
    text: 'Se neste avgang begge veier, rett fra rutetabellen og med forsinkelser.',
    art: FerryArt,
  },
  {
    title: 'Dokumenter og manualer',
    text: 'Last opp manualer, kontrakter og bilder som gjelder hytta, så finner alle dem når de trenger dem.',
    art: DocsArt,
  },
  {
    title: 'Historikk',
    text: 'Fullførte oppgaver og fiksede feil havner i historikken, så dere ser når ting sist ble gjort.',
    art: HistoryArt,
  },
  {
    title: 'Velg dine varsler',
    text: 'Slå på varsler under Mer, og velg selv hva du vil høre om, for eksempel nye feil eller dugnad.',
    art: PushArt,
  },
  {
    title: 'Virker uten dekning',
    text: 'Les og endre alt på hytta, også uten nett. Endringene sendes av seg selv når du får dekning.',
    art: OfflineArt,
  },
]

/** Når en animert bit starter, i sekunder: d = kommer inn, t = krysses av, s = teksten byttes. */
const at = (d: number, more: { t?: number; s?: number } = {}) =>
  ({ '--d': `${d}s`, ...(more.t !== undefined && { '--t': `${more.t}s` }), ...(more.s !== undefined && { '--s': `${more.s}s` }) }) as CSSProperties

/**
 * Velkomstintroen: korte, animerte scener laget av appens egne kort og rader.
 * Brukeren blar selv med Forrige og Neste (eller sveip og piltaster).
 */
export function Intro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const last = step === scenes.length - 1
  const scene = scenes[step]
  const Art = scene.art

  function go(to: number) {
    setStep(Math.max(0, Math.min(scenes.length - 1, to)))
  }

  // Siste versjoner, så tastaturlytteren under bare legges på én gang.
  const close = useRef(onClose)
  const move = useRef((by: number) => go(step + by))
  useEffect(() => {
    close.current = onClose
    move.current = (by: number) => go(step + by)
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
      if (e.key === 'ArrowRight') move.current(1)
      if (e.key === 'ArrowLeft') move.current(-1)
      // Tab blir i introen, så tastaturbrukere ikke havner bak den.
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>('button')
        const first = focusable[0]
        const lastEl = focusable[focusable.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
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

  // Sveip til siden for neste eller forrige scene.
  const startX = useRef<number | null>(null)

  // Scenene er laget i full størrelse; på lave skjermer krympes de så alt får plass.
  const stage = useRef<HTMLDivElement>(null)
  const art = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const s = stage.current
    const a = art.current
    if (!s || !a) return
    const fit = () => {
      const pad = parseFloat(getComputedStyle(s).paddingTop) * 2
      a.style.transform = `scale(${Math.min(1, (s.clientHeight - pad) / a.offsetHeight)})`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(s)
    observer.observe(a)
    return () => observer.disconnect()
  }, [step])

  return (
    <div className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title" tabIndex={-1} ref={ref}>
      <div className="intro-top">
        <span className="t-caption">
          {step + 1} av {scenes.length}
        </span>
        <button type="button" className="ha-btn ha-btn-ghost" onClick={onClose}>
          Hopp over
        </button>
      </div>

      <div
        className="intro-stage"
        aria-hidden="true"
        ref={stage}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return
          const dx = e.clientX - startX.current
          startX.current = null
          if (Math.abs(dx) > 50) go(step + (dx < 0 ? 1 : -1))
        }}
      >
        <div className="intro-art" key={step} ref={art}>
          <Art />
        </div>
      </div>

      <div className="intro-text" key={step} aria-live="polite">
        <h2 className="t-title iv-in" id="intro-title">
          {scene.title}
        </h2>
        <p className="t-body-lg muted iv-in" style={at(0.08)}>
          {scene.text}
        </p>
      </div>

      <div className="intro-dots" aria-hidden="true">
        {scenes.map((s, i) => (
          <span key={s.title} className={`intro-dot${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`} />
        ))}
      </div>

      <div className="intro-nav">
        {step > 0 && (
          <button type="button" className="ha-btn ha-btn-secondary" onClick={() => go(step - 1)}>
            Forrige
          </button>
        )}
        <button type="button" className="ha-btn ha-btn-primary" onClick={last ? onClose : () => go(step + 1)}>
          {last ? 'Kom i gang' : 'Neste'}
        </button>
      </div>
    </div>
  )
}

/*
 * Scenene. Hver bit står i sin ferdige tilstand i CSS-en og animeres inn fra
 * en starttilstand, så alt står riktig også når animasjoner er slått av.
 */

function FaultArt() {
  return (
    <div className="stack">
      <div className="ha-card iv-in" style={at(0)}>
        <div className="intro-photo iv-pop" style={at(0.15)}>
          <svg viewBox="0 0 200 96">
            <rect className="iv-tile" width="200" height="96" />
            <path className="iv-tap" d="M70 30 h52 a10 10 0 0 1 10 10 v12 h-14 v-8 h-48 z" />
            <rect className="iv-tap" x="88" y="18" width="16" height="14" rx="3" />
            <rect className="iv-tap" x="78" y="12" width="36" height="8" rx="4" />
            <ellipse className="iv-sink" cx="125" cy="92" rx="56" ry="10" />
            <path className="iv-drop" d="M125 58 q-6 9 0 13 q6 -4 0 -13z" />
          </svg>
        </div>
        <span className="t-body-lg iv-type" style={at(0.9)}>
          Kranen på badet drypper
        </span>
      </div>
      <div className="ha-list iv-in" style={at(2.2)}>
        <div className="ha-li">
          <Wrench className="ha-ico" />
          <span className="ha-li-main">
            <span className="ha-li-title">Kranen på badet drypper</span>
            <span className="ha-li-meta">Meldt av deg · nå</span>
          </span>
          <FaultBadge />
        </div>
      </div>
      <div className="intro-toast iv-in" style={at(3.1)}>
        <span className="ha-toast">
          <Bell className="ha-ico ico-sm" />
          Kari og Ola har fått varsel
        </span>
      </div>
    </div>
  )
}

function ShoppingArt() {
  return (
    <div className="stack">
      <div className="quickadd iv-in" style={at(0)}>
        <span className="ha-input intro-input">
          <span className="iv-type" style={at(0.4)}>
            Kaffe
          </span>
        </span>
        <span className="ha-btn ha-btn-primary iv-press" style={at(1.2)}>
          Legg til
        </span>
      </div>
      <div className="ha-list">
        <ShopRow name="Kaffe" meta="Lagt til av deg" style={at(1.45)} className="iv-grow" />
        <ShopRow name="Melk" meta="Kjøpt av Ola" bought style={at(0.1, { t: 2.5, s: 2.7 })} />
        <ShopRow name="Grillkull" meta="Lagt til av Kari" style={at(0.2)} />
      </div>
    </div>
  )
}

function ShopRow({ name, meta, bought, style, className = 'iv-in' }: { name: string; meta: string; bought?: boolean; style: CSSProperties; className?: string }) {
  return (
    <div className={`ha-check ${className}${bought ? ' iv-tick' : ''}`} aria-checked={bought} style={style}>
      <span className="ha-box">
        <Check className="ha-ico" />
      </span>
      <span className="ha-li-main">
        <span className="ha-li-title">{name}</span>
        <span className="ha-li-meta">
          {bought ? (
            <span className="iv-swap">
              <span className="iv-was">Lagt til av Kari</span>
              <span className="iv-now">{meta}</span>
            </span>
          ) : (
            meta
          )}
        </span>
      </span>
    </div>
  )
}

function FerryArt() {
  return (
    <div className="stack">
      <div className="intro-route iv-in" style={at(0)}>
        <span className="intro-dock">Fastlandet</span>
        <span className="intro-water">
          <span className="intro-boat iv-sail" style={at(0.3)}>
            <Ship className="ha-ico" />
          </span>
        </span>
        <span className="intro-dock">Øya</span>
      </div>
      <div className="ha-card iv-in" style={at(0.6)}>
        <span className="sec-h">
          <span className="t-heading">Neste ferge</span>
          <span className="ha-badge ha-badge-fikset iv-in" style={at(2.4)}>
            Går om 12 min
          </span>
        </span>
        <span className="ferry-halves">
          <span className="ferry-half is-out is-main iv-in" style={at(1.1)}>
            <span className="ferry-dir">Fra Fastlandet</span>
            <span className="ferry-time-row">
              <span className="ferry-next">14:35</span>
              <DirectionIcon dir="out" />
            </span>
            <span className="ferry-sub">Til Øya</span>
          </span>
          <span className="ferry-half is-home iv-in" style={at(1.4)}>
            <span className="ferry-dir">Fra Øya</span>
            <span className="ferry-time-row">
              <span className="ferry-next">15:10</span>
              <DirectionIcon dir="home" />
            </span>
            <span className="ferry-sub">Til Fastlandet</span>
          </span>
        </span>
      </div>
    </div>
  )
}

function OfflineArt() {
  return (
    <div className="stack">
      <div className="intro-pills">
        <span className="ha-offline iv-out" style={at(3.3)}>
          <CloudOff className="ha-ico" />
          Frakoblet · 1 endring venter
        </span>
        <span className="ha-offline is-synced iv-in" style={at(3.5)}>
          <Check className="ha-ico" />
          Alt er sendt
        </span>
      </div>
      <div className="ha-list iv-in" style={at(0)}>
        <div className="ha-check" aria-checked="true">
          <span className="ha-box">
            <Check className="ha-ico" />
          </span>
          <span className="ha-li-main">
            <span className="ha-li-title">Slå på strømmen</span>
          </span>
        </div>
        <div className="ha-check iv-tick" aria-checked="true" style={at(0, { t: 1.2, s: 3.5 })}>
          <span className="ha-box">
            <Check className="ha-ico" />
          </span>
          <span className="ha-li-main">
            <span className="ha-li-title">Sett på vannet</span>
            <span className="ha-li-meta iv-in" style={at(1.4, { s: 3.5 })}>
              <span className="iv-swap">
                <span className="iv-was pending">
                  <Clock className="ha-ico ico-sm" />
                  Venter på nett
                </span>
                <span className="iv-now">Sendt av deg · nå</span>
              </span>
            </span>
          </span>
        </div>
        <div className="ha-check" aria-checked="false">
          <span className="ha-box">
            <Check className="ha-ico" />
          </span>
          <span className="ha-li-main">
            <span className="ha-li-title">Fyr i peisen</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function DocsArt() {
  return (
    <div className="stack">
      <span className="ha-btn ha-btn-primary ha-btn-block iv-in iv-press" style={at(0, { t: 0.5 })}>
        <Upload className="ha-ico" />
        Last opp
      </span>
      <div className="ha-card iv-in intro-upload" style={at(0.7, { s: 2.3 })}>
        <span className="row">
          <span className="doc-type">PDF</span>
          <span className="ha-li-main">
            <span className="ha-li-title">Varmepumpe – bruksanvisning</span>
            <span className="ha-li-meta">
              <span className="iv-swap">
                <span className="iv-was">Laster opp …</span>
                <span className="iv-now">
                  <Check className="ha-ico ico-sm" />
                  Lastet opp i Manualer
                </span>
              </span>
            </span>
          </span>
        </span>
        <span className="progress">
          <span className="iv-bar" style={at(0.9)} />
        </span>
      </div>
      <h3 className="list-h iv-in" style={at(0.2)}>
        Manualer
      </h3>
      <div className="ha-list iv-in" style={at(0.2)}>
        <DocRow name="Varmepumpe – bruksanvisning" meta="Lagt til av deg · nå" className="iv-grow" style={at(2.6)} />
        <DocRow name="Peisovn" meta="Lagt til av Kari" />
        <DocRow name="Strømskap" meta="Lagt til av Ola" img />
      </div>
    </div>
  )
}

function DocRow({ name, meta, img, className = '', style }: { name: string; meta: string; img?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div className={`ha-li ${className}`} style={style}>
      <span className={img ? 'doc-type img' : 'doc-type'}>{img ? 'Bilde' : 'PDF'}</span>
      <span className="ha-li-main">
        <span className="ha-li-title">{name}</span>
        <span className="ha-li-meta">{meta}</span>
      </span>
      <ChevronRight className="ha-ico ha-chev" />
    </div>
  )
}

function HistoryArt() {
  return (
    <div className="stack">
      <div className="ha-list iv-in" style={at(0)}>
        <div className="ha-check iv-tick" aria-checked="true" style={at(0, { t: 0.8 })}>
          <span className="ha-box">
            <Check className="ha-ico" />
          </span>
          <span className="ha-li-main">
            <span className="ha-li-title">Bytte batteri i røykvarsleren</span>
            <span className="ha-li-meta">Oppgave</span>
          </span>
        </div>
      </div>
      <h3 className="list-h iv-in" style={at(1.2)}>
        Historikk 2026
      </h3>
      <div className="ha-list iv-in" style={at(1.2)}>
        <HistoryRow title="Bytte batteri i røykvarsleren" meta="11. okt. · deg" badge="Oppgave" className="iv-grow" style={at(1.9)} />
        <HistoryRow title="Kranen på badet drypper" meta="2. sep. · Ola" badge="Feil fikset" />
        <HistoryRow title="Malte terrassen" meta="14. juni · Kari" />
      </div>
    </div>
  )
}

function HistoryRow({ title, meta, badge, className = '', style }: { title: string; meta: string; badge?: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`ha-li ${className}`} style={style}>
      <span className="ha-li-main">
        <span className="ha-li-title">{title}</span>
        <span className="ha-li-meta">
          {meta}
          {badge && <span className="ha-badge ha-badge-neutral">{badge}</span>}
        </span>
      </span>
      <ChevronRight className="ha-ico ha-chev" />
    </div>
  )
}

function PushArt() {
  return (
    <div className="stack">
      <div className="intro-push iv-drop-in" style={at(3.2)}>
        <img src="/icons/icon-192.png" alt="" width={36} height={36} />
        <span className="ha-li-main">
          <span className="intro-push-title">Ny feil på Furulia</span>
          <span className="ha-li-meta">Kari: Det lekker fra taket i boden</span>
        </span>
      </div>
      <div className="ha-list iv-in" style={at(0)}>
        <div className="ha-li">
          <Bell className="ha-ico" />
          <span className="ha-li-main">
            <span className="ha-li-title">Varsler på denne enheten</span>
          </span>
          <span className="switch iv-flip" aria-checked="true" style={at(0, { t: 0.7 })} />
        </div>
      </div>
      <h3 className="list-h iv-in" style={at(1.2)}>
        Varsle meg om
      </h3>
      <div className="ha-list iv-in" style={at(1.2)}>
        <PrefRow label="Ny feil" on />
        <PrefRow label="Ny hendelse i kalenderen" on flip={2.2} />
        <PrefRow label="Ny oppgave" />
      </div>
    </div>
  )
}

function PrefRow({ label, on, flip }: { label: string; on?: boolean; flip?: number }) {
  return (
    <div className="ha-li">
      <span className="ha-li-main">
        <span className="ha-li-title">{label}</span>
      </span>
      <span className={`switch${flip ? ' iv-flip' : ''}`} aria-checked={on} style={flip ? at(0, { t: flip }) : undefined} />
    </div>
  )
}
