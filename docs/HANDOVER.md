# Handover: Hytteappen

Til Claude Code. Dette dokumentet beskriver hva som skal bygges, hvilke beslutninger som er tatt og i hvilken rekkefølge arbeidet bør gjøres. Alt språk i appen er norsk bokmål.

- **Repo:** `Henning793/hytte` (tomt, start fra bunnen).
- **Eier:** Henning (GitHub `Henning793`).
- **Design:** Ligger i `docs/design/` (kopier mappen `design/` som følger med denne filen dit). Prototypen finnes også på claude.ai: https://claude.ai/artifact/KuuwxkKsJStRGRiPwtpaNt og designsystemet på https://claude.ai/artifact/CEptSsKjMm5seuCwdXHp31.

Hvis noe her er i konflikt med designfilene, gjelder **denne filen**.

---

## 1. Hva appen er

En mobil-først PWA der familier som deler en hytte samarbeider om det praktiske: gjøremål og vedlikehold, feil og mangler (med bilde), felles handleliste, dokumenter og manualer, info og koder, og sjekkliste for ankomst og avreise.

Hvem som helst kan opprette sin egen hytte. Hver hytte er helt adskilt fra de andre. Én bruker kan være med i flere hytter og bytter mellom dem med en hyttevelger.

Typisk hytte: 5–15 brukere, fra tenåringer til besteforeldre. Det er ofte dårlig mobildekning på hytta.

## 2. Teknisk oppsett

| Del | Valg |
|---|---|
| Frontend | React + TypeScript + Vite |
| PWA | `vite-plugin-pwa` (Workbox), installerbar på iPhone (Legg til på Hjem-skjerm) og Android |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security |
| Hosting | Netlify, gratis `*.netlify.app`-adresse (ikke eget domene nå) |
| Ikoner | `lucide-react` |
| Font | Atkinson Hyperlegible Next (Google Fonts), fallback system-ui |
| Offline | IndexedDB (f.eks. `dexie`) som lokal cache + utboks for endringer |
| Bilder | Komprimeres i nettleseren før opplasting (f.eks. `browser-image-compression`) |

Styling: bruk CSS-variablene og klassene i `docs/design/prototype/hytte.css` som utgangspunkt (lys og mørk tema via `data-theme`). Tokens står i `docs/design/tokens.json`. Ikke innfør et UI-bibliotek.

Miljøvariabler i Netlify og `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Netlify trenger en SPA-redirect (`/* /index.html 200`) så invitasjonslenker virker.

## 3. Roller og rettigheter

Rollene gjelder per hytte.

- **Admin:** den som opprettet hytta. Eneste som kan invitere, lage ny invitasjonslenke, fjerne medlemmer og redigere de faste punktene i sjekklistene.
- **Medlem:** kan opprette, redigere og krysse av alt (gjøremål, feil, handleliste, dokumenter, info og koder).
- **Sletting:** bare den som opprettet et element, og admin, kan slette det. I UI vises «Slett» bare for dem. Andre ser «Bare Ola kan slette dette». Før noe slettes, spør appen «Er du sikker?».
- **Unntak:** «Fjern kjøpte varer» på handlelisten kan brukes av alle og fjerner alle avkryssede varer, uansett hvem som la dem inn.
- **Status på feil** (Ny, Pågår, Fikset) kan endres av alle medlemmer.
- Skjul handlinger brukeren ikke har lov til. Ingen deaktiverte knapper uten forklaring.

Alt dette **må** håndheves med RLS i databasen, ikke bare i UI.

## 4. Innlogging og invitasjon

**Innlogging:** e-post og passord via Supabase Auth.
- *Opprett bruker:* fornavn, e-post, passord og «gjenta passord». Begge passordfeltene har øye-knapp («Vis passord» / «Skjul passord»). Minst 8 tegn. Feilmeldingen «Passordene er ikke like. Skriv det samme passordet i begge feltene.» vises under det andre feltet når man trykker «Opprett bruker», og forsvinner så snart feltene er like.
- *Logg inn:* e-post og **ett** passordfelt med øye. «Glemt passord?» sender tilbakestillingslenke på e-post (Supabase reset), med egen side for å sette nytt passord.
- Man forblir innlogget (persistert sesjon, automatisk fornying).
- Avklar med Henning om e-postbekreftelse ved registrering skal være på i Supabase. Standardvalg: av, så første innlogging går raskt.

**Invitasjon via lenke:**
1. Admin trykker «Inviter» under Medlemmer og får en lenke `https://<site>.netlify.app/bli-med/<token>` med «Del på SMS» (`sms:`-lenke / Web Share API) og «Kopier».
2. Mottaker åpner lenken. Er de ikke innlogget, kan de opprette bruker eller logge inn. Tokenet må huskes gjennom registreringen (f.eks. i `sessionStorage`).
3. Skjermen «Bli med i [hyttenavn]» viser hvem som inviterte og hvor mange som er med. «Bli med» gjør dem til medlem straks, uten godkjenning.
4. «Lag ny lenke» genererer nytt token, og den gamle lenken slutter å virke. Lenken utløper ellers ikke.
5. Det finnes også «Jeg har fått en invitasjonslenke», der man kan lime inn lenken manuelt.

Join skjer via en `security definer`-funksjon (`join_cabin(token)`), slik at ikke-medlemmer aldri kan lese hytter direkte.

## 5. Datamodell (forslag)

Alle tabeller med innhold har `cabin_id`, `created_by` (default `auth.uid()`), `created_at`, `updated_at`. Bruk UUID-er generert på klienten, slik at elementer laget offline har stabil id.

```
profiles          id (= auth.users.id), first_name, created_at
cabins            id, name, photo_path?, invite_token (unik, tilfeldig), created_by
cabin_members     cabin_id, user_id, role ('admin' | 'member'), joined_at   PK(cabin_id, user_id)

tasks             id, cabin_id, title, description?, kind ('gjoremal' | 'vedlikehold'),
                  responsible_user_id?, due_date?, done (bool), done_by?, done_at?, created_by …
issues            id, cabin_id, title, description?, status ('ny' | 'pagar' | 'fikset'),
                  photo_path?, created_by …
shopping_items    id, cabin_id, name, done (bool), bought_by?, bought_at?, created_by …
documents         id, cabin_id, name, category ('manualer' | 'dokumenter'),
                  file_path, mime_type, size_bytes, created_by …
cabin_info        cabin_id (PK), wifi_name?, wifi_password?, keybox_code?, keybox_location?,
                  trash_info?, store_info?, notes?, updated_by, updated_at
checklist_items   id, cabin_id, kind ('ankomst' | 'avreise'), text, hint?, position
checklist_runs    id, cabin_id, kind, completed_by, completed_at
```

RLS-hjelpere: `is_member(cabin_id)` og `is_admin(cabin_id)` (security definer, stabile).

| Tabell | Lese | Opprette | Endre | Slette |
|---|---|---|---|---|
| cabins | medlem | innlogget (blir admin via trigger/RPC) | admin | admin |
| cabin_members | medlem | via `join_cabin` / ved opprettelse | admin | admin (ikke seg selv som siste admin) |
| tasks, issues, documents | medlem | medlem | medlem | `created_by = auth.uid()` eller admin |
| shopping_items | medlem | medlem | medlem | eier, admin, **eller `done = true`** |
| cabin_info | medlem | medlem | medlem | – |
| checklist_items | medlem | medlem | medlem | `created_by = auth.uid()` eller admin |
| checklist_runs | medlem | medlem | – | admin |
| profiles | seg selv + de man deler hytte med | seg selv | seg selv | – |

Når et medlem fjernes, mister de tilgang med en gang, men det de har lagt inn blir liggende.

**Storage:** én privat bucket `cabin-files`, stier `{cabin_id}/{type}/{uuid}.{ext}`. Storage-policies sjekker `is_member` på første mappenavn. Vis filer med signerte URL-er.

**Filer:** PDF og bilder, maks 20 MB per fil. Bilder komprimeres til omtrent 1600 px lengste side før opplasting.

## 6. Frakoblet (viktig)

Det er dårlig dekning på hytta, så appen må tåle å være uten nett:
- Service worker cacher app-skallet, så appen åpner uten nett.
- Siste kjente data for valgt hytte (gjøremål, feil, handleliste, info og koder, sjekklister, dokumentliste) caches i IndexedDB og vises uten nett.
- Alt som opprettes, krysses av eller endres uten nett legges i en lokal **utboks** og sendes i rekkefølge når nettet er tilbake. Bilder venter i utboksen som blob.
- UI: et diskret banner under toppfeltet: «Frakoblet – endringer lagres og sendes når du får nett». Elementer som ikke er sendt viser klokkeikon og «Venter på nett». Når alt er sendt: «Alt er sendt» i 3 sekunder.
- Konflikter: siste skriving vinner. Det holder for denne appen.
- PDF-er som er åpnet før, bør kunne åpnes igjen offline (cache signert fil i IndexedDB eller Cache API). Opplasting av dokumenter kan kreve nett.

## 7. Skjermer i første versjon

Se `docs/design/navigasjon.md` og prototypen for oppsett og tekster. Bunnmeny: **Hjem, Gjøremål, Feil, Handleliste, Mer**. Feil-fanen viser antall åpne feil, Handleliste antall varer.

1. **Velkommen:** Opprett bruker (primær) / Logg inn.
2. **Ingen hytte ennå:** Opprett hytte (navn, valgfritt bilde, du blir admin) / Jeg har fått en invitasjonslenke.
3. **Bli med i [hyttenavn].**
4. **Hjem:** hyttevelger øverst (pil og ark bare hvis man er med i flere hytter), snarveiene «Meld feil» og «Ankomst / Avreise», kort med åpne feil, neste gjøremål og handleliste.
5. **Gjøremål:** filter Alle / Gjøremål / Vedlikehold. Nytt gjøremål: tittel, beskrivelse, ansvarlig (velg medlem), frist (dato). Fullførte vises samlet nederst.
6. **Feil og mangler:** åpne øverst, fiksede under. «Meld feil»: «Ta bilde» (`<input type="file" accept="image/*" capture="environment">`), tittel, beskrivelse. Detalj: bilde, status kan endres av alle.
7. **Handleliste:** hurtiginnlegging øverst, avkryssing setter «Kjøpt av [navn]», «Fjern kjøpte varer».
8. **Dokumenter og manualer:** to faste mapper, **Manualer** og **Dokumenter** (prototypen har tre, bruk to). Last opp: ta bilde eller velg PDF/bilde. Visning: bilder i appen, PDF-er åpnes i nettleserens egen visning. Last ned.
9. **Info og koder:** wifi-navn og -passord (Kopier-knapp), nøkkelboks (koden er skjult til man trykker «Vis kode», pluss hvor boksen er), søppeltømming, nærmeste butikk, faste nødnumre (110, 112, 113, 116 117) og fritekst «Greit å vite». Alle medlemmer kan redigere.
10. **Sjekkliste (Ankomst / Avreise):** faste punkter med valgfritt hint, som alle medlemmer kan legge til og sortere. Den som la inn et punkt, og admin, kan fjerne det. Avkryssing er **personlig og lokal** på telefonen og viser fremdrift. «Ferdig» lagrer en `checklist_run` og nullstiller listen. Alle ser siste gjennomgang, f.eks. «Avreise fullført av Mari, søn.».
11. **Medlemmer:** liste med rolle. Admin ser Inviter (ark med lenke, Del på SMS, Kopier, Lag ny lenke) og Fjern (bekreftelse «Fjerne Ola fra Furulia?»).
12. **Mine hytter:** liste og «Opprett ny hytte» / «Jeg har fått en invitasjonslenke».
13. **Mer:** lenker til 8–12, Innstillinger med «Mørkt tema» (følg systemet som standard), Logg ut. Under en skillelinje: Kalender, Historikk og Varsler som grå rader merket «Kommer».

Prototypen har en «Simuler frakoblet»-bryter. Den skal **ikke** med i appen.

## 8. Utenfor første versjon

Ikke bygg disse nå, men ikke stå i veien for dem:
- Kalender (felles aktiviteter som dugnad, og perioder hytta er utilgjengelig). Ingen booking per familie.
- Historikk over når ting sist ble gjort (maling, kledning osv.).
- Push-varsler (ny feil, ny felles aktivitet, påminnelse før dugnad). Web Push virker på iPhone når appen er lagt til på Hjem-skjermen.
- Fordeling av utgifter.
- Noe som deles på tvers av hytter (hyttefelt, veilag).
- Google-innlogging, eget domene.

## 9. Rekkefølge

Lag én PR per steg, og hold hver PR liten nok til å lese.

1. **Grunnmur:** Vite + React + TS, PWA-manifest og ikoner, tema og CSS fra designet, ruting, Netlify-konfig. Lint og typecheck i CI (GitHub Actions).
2. **Database:** Supabase-migrasjoner i `supabase/migrations/` for alle tabeller, RLS, hjelpefunksjoner, `join_cabin`, storage-bucket og policies. Skriv SQL-tester eller et skript som beviser at RLS stopper ikke-medlemmer og at slette-reglene holder.
3. **Innlogging:** opprett bruker, logg inn, glemt passord, profil med fornavn.
4. **Hytter:** opprett hytte, hyttevelger, Mine hytter, invitasjon og bli med, Medlemmer.
5. **Innhold:** Hjem, Gjøremål, Feil med bilde, Handleliste.
6. **Mer:** Dokumenter, Info og koder, Sjekklister.
7. **Frakoblet:** cache, utboks, banner og «Venter på nett». Test med nettverket av i DevTools og på en ekte telefon.
8. **Ferdigstilling:** tilgjengelighet (fokusring, labels, 56 px trykkflater), mørkt tema, test på iPhone Safari og Android Chrome.

## 10. Ferdig betyr

- En ny bruker kan opprette bruker, opprette hytte, invitere via SMS-lenke, og den inviterte er med etter ett trykk.
- Et medlem av hytte A kan ikke lese eller endre noe i hytte B, verken via appen eller direkte mot Supabase-API-et.
- Feil kan meldes med bilde fra kameraet på iPhone og Android.
- Med flymodus på kan man åpne appen, se data, krysse av og legge til, og alt sendes når nettet er tilbake.
- Appen kan installeres på Hjem-skjermen på begge plattformer.

## 11. Det Henning må gjøre selv

- Opprette et Supabase-prosjekt (gratis) og gi URL og anon-nøkkel.
- Koble repoet til Netlify og legge inn miljøvariablene.
- Legge inn Netlify-adressen som Site URL og redirect-URL i Supabase Auth, så «Glemt passord»-lenker virker.
