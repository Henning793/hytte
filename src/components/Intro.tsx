import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Bell, Check, Clock, CloudOff, Ship, Wrench } from 'lucide-react'
import { DirectionIcon } from '../screens/ferry/DirectionIcon'
import { FaultBadge } from './FaultBadge'

/** Hvor lenge hver scene står før introen går videre av seg selv. */
const SCENE_MS = 5500

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
    title: 'Virker uten dekning',
    text: 'Les og endre alt på hytta, også uten nett. Endringene sendes av seg selv når du får dekning.',
    art: OfflineArt,
  },
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Når en animert bit starter, i sekunder: d = kommer inn, t = krysses av, s = teksten byttes. */
const at = (d: number, more: { t?: number; s?: number } = {}) =>
  ({ '--d': `${d}s`, ...(more.t !== undefined && { '--t': `${more.t}s` }), ...(more.s !== undefined && { '--s': `${more.s}s` }) }) as CSSProperties

/**
 * Velkomstintroen: fire korte, animerte scener laget av appens egne kort og rader.
 * Går videre av seg selv til brukeren trykker selv, eller med redusert bevegelse.
 */
export function Intro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(() => !reducedMotion())
  const ref = useRef<HTMLDivElement>(null)
  const last = step === scenes.length - 1
  const scene = scenes[step]
  const Art = scene.art

  useEffect(() => {
    if (!auto || last) return
    const t = setTimeout(() => setStep((s) => s + 1), SCENE_MS)
    return () => clearTimeout(t)
  }, [auto, last, step])

  function go(to: number) {
    setAuto(false)
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
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return
          const dx = e.clientX - startX.current
          startX.current = null
          if (Math.abs(dx) > 50) go(step + (dx < 0 ? 1 : -1))
        }}
      >
        <div className="intro-art" key={step}>
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
          <span key={s.title} className={`intro-dot${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}>
            {i === step && auto && !last && <span className="intro-dot-fill" style={{ animationDuration: `${SCENE_MS}ms` }} />}
          </span>
        ))}
      </div>

      <button type="button" className="ha-btn ha-btn-primary ha-btn-block" onClick={last ? onClose : () => go(step + 1)}>
        {last ? 'Kom i gang' : 'Neste'}
      </button>
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
