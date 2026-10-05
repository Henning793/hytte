Hytteappen er en mobil-først PWA der familier som deler en hytte holder orden på det praktiske sammen. Brukerne spenner fra tenåringer til besteforeldre, og appen brukes ofte ute på trappa i sterkt sollys og med dårlig dekning. Alt i systemet springer ut av tre løfter: **lett å lese, lett å treffe, lett å forstå**.

## Prinsipper

- **Én hovedhandling per skjerm.** Hver skjerm har høyst én `ha-btn-primary`. Andre handlinger er `ha-btn-secondary` eller `ha-btn-ghost`.
- **Store trykkflater.** Alt som kan trykkes er minst `tap-min` (56px) høyt, også hele raden rundt en avkrysningsboks. Aldri ikon-knapper uten tekst, unntatt øyet i passordfelt og lukk-kryss i ark.
- **Få valg.** Maks fem punkter i bunnmenyen, maks tre segmenter i et filter, maks fire felt i et skjema før det deles opp.
- **Lesbar i sollys.** Brødtekst er aldri under `body` (17px), metadata aldri under `caption` (15px). `ink` holder minst 13:1 og `ink-muted` minst 6:1 på alle flater i begge temaer.
- **Rolig, nordisk, moderne.** Varme papirtoner og furugrønt, rene flater og tynne linjer. Ingen trestrukturer, rutete stoff eller rustikke skrifttyper.

## Språk og tone

- Bokmål, du-form, korte setninger. Skriv som en hjelpsom nabo, ikke som et system: «Du er nå med i Furulia», ikke «Medlemskap registrert».
- Vanlig setningsstørrelse i alle titler og knapper: «Meld feil», «Opprett hytte», «Legg til vare».
- Knapper sier hva som skjer: «Send feilmelding», ikke «OK». Destruktive handlinger navngir det som forsvinner: «Fjern Ola fra hytta».
- Feilmeldinger er vennlige, forklarer hva som skjedde og hva du gjør nå. Eksempler:
  - «Passordene er ikke like. Skriv det samme passordet i begge feltene.»
  - «Passordet må ha minst 8 tegn.»
  - «Vi fant ingen bruker med den e-postadressen. Sjekk skrivemåten, eller opprett en ny bruker.»
  - «Invitasjonslenken er utløpt. Be den som inviterte deg om en ny lenke.»
- Ingen emoji i grensesnittet. Status vises alltid med ord («Ny», «Pågår», «Fikset»), aldri bare med farge.
- Tall og datoer på norsk: «i dag», «i morgen», «fre. 10. okt.», «3 varer».

## Farger

- Bakgrunnen er alltid `surface`. Kort, rader, felt, bunnmeny og ark ligger på `surface-raised`. `surface-sunk` brukes til forsenkede felt: filtersporet og hurtiginnlegging.
- All tekst er `ink`. Metadata («Opprettet av Ola · i går») er `ink-muted`.
- `primary` (furugrønn) er fargen for handling: hovedknapp, aktiv fane, krysset boks, lenker. Tekst på `primary` er `on-primary`.
- `accent` (oker, lav høstsol) er bare til dekor: hyttebilde-plassholdere, illustrasjoner, omslag. Aldri tekst i lyst tema.
- Status for feil og mangler: **Ny** = `danger-soft` + `on-danger-soft`, **Pågår** = `accent-soft` + `on-accent-soft`, **Fikset** = `primary-soft` + `on-primary-soft`. Hvert merke har både ord og ikon, og de skilles også på lyshet, ikke bare fargetone.
- `danger` brukes bare til feiltekst og destruktive knapper. Feilmeldinger under felt ligger i en `danger-soft`-boks med `on-danger-soft`-tekst.
- Kanter: `line` er dekorative hårlinjer mellom rader. Kontroller (felt, bokser, sekundærknapper) har alltid `line-strong`, som holder 3:1.
- Fokusring: 3px heltrukken `focus`, 2px avstand, på alle kontroller.
- Mørkt tema er et eget, fullverdig tema, ikke en invertering: grønn og oker lysnes, og fyllfarger får mørk tekst (`on-primary`).

## Typografi

- Én familie: Atkinson Hyperlegible Next (`sans`), laget for maksimal lesbarhet med tydelig skille mellom I, l og 1, og mellom O og 0. Det er viktig for koder og wifi-passord.
- `display` bare på Velkommen og «Bli med i …». `title` er skjermtittelen. `heading` brukes til seksjoner og korttitler på Hjem.
- `body-lg` (19px) er standard for radtitler, input og knapper. `body` (17px) er for beskrivelser. `caption` (15px, `ink-muted`) er for metadata.
- `code` (24px, sperret) brukes til nøkkelbokskoder og wifi-passord på Info og koder, alltid med en «Kopier»-knapp ved siden av.
- Aldri tynnere enn vekt 400, aldri kursiv for innhold, aldri versaler for hele ord.

## Avstand, form og dybde

- Sidemarg `space-4`. Avstand mellom seksjoner `space-6`. Avstand mellom rader og kort `space-3`.
- Radius: `radius-md` på knapper, felt og rader; `radius-lg` på kort, snarveisfliser og ark; `radius-sm` på merker og avkrysningsbokser; `radius-pill` på filter, frakoblet-indikator og toast.
- Kort skilles med `line`-kant, ikke skygge. Bare bunnark og bunnmeny får `shadow-sheet`.
- Animasjon er rolig og kort (150–200 ms), og bare for å vise hvor noe kom fra: ark glir opp, avkryssing fylles. Ingen sprett, ingen konfetti.

## Ikoner

- Lucide-stil: 24px rutenett, 2px strek, avrundede ender, `currentColor`. Bruk Lucide (ISC-lisens) i appen. Det finnes ingen egne ikonfiler i systemet ennå.
- Ikoner står alltid sammen med tekst, unntatt øyet («Vis passord» / «Skjul passord» som tilgjengelig navn) og lukk-krysset.
- Faste ikoner: Hjem `house`, Gjøremål `list-checks`, Feil `wrench`, Handleliste `shopping-cart`, Mer `menu`, Meld feil `camera`, Ankomst / Avreise `door-open`, frakoblet `cloud-off`, venter på sending `clock`.

## Frakoblet

- Når appen mister nett, vises `OfflineBanner` diskret under toppfeltet: «Frakoblet – endringer lagres og sendes når du får nett». Den dekker aldri innhold og kan ikke lukkes.
- Alt kan fortsatt opprettes og krysses av. Endringer som ikke er sendt, får et lite `clock`-ikon og «Venter på nett» i `caption`.
- Når nettet er tilbake, bytter banneret til «Alt er sendt» i `primary-soft` i 3 sekunder og forsvinner.

## Roller

- **Admin** (den som opprettet hytta) er den eneste som ser «Inviter», «Lag ny lenke» og «Fjern» under Medlemmer, og som kan redigere de faste punktene i sjekklistene.
- **Medlem** kan opprette, redigere og krysse av alt. «Slett» vises bare på det du selv har opprettet. På andres punkter står det i stedet «Bare Ola kan slette dette» i `caption`.
- Skjul handlinger du ikke har lov til. Ikke vis deaktiverte knapper uten forklaring.
