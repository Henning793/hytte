# Navigasjon og skjermer

## Bunnmeny

Fem faner, alltid synlige inne i en hytte: **Hjem**, **Gjøremål**, **Feil**, **Handleliste**, **Mer**. Bruk `BottomNav`. Feil-fanen viser antall åpne feil som et tall-merke, og Handleliste viser antall varer.

Under **Mer** ligger: Dokumenter, Info og koder, Sjekklister, Medlemmer og Mine hytter, i den rekkefølgen. Info og koder ligger øverst etter Dokumenter fordi den brukes mest ved ankomst. Under en skillelinje kommer de kommende funksjonene som grå rader merket «Kommer», slik at de har en fast plass: Kalender, Historikk og Varsler.

Hjem har to store snarveier (`ShortcutTile`): «Noe som mangler eller må fikses?» (primær, åpner «Meld feil») og «Ankomst / Avreise» (sekundær). Det gjør at de to viktigste handlingene på hytta aldri ligger mer enn ett trykk unna, selv om sjekklistene bor under Mer.

## Hyttevelger

Hyttenavnet står øverst på Hjem (`CabinSwitcher`). Er du med i flere hytter, har navnet en pil og åpner et ark med hyttene dine, med «Mine hytter» nederst. Er du bare med i én hytte, er navnet ren tekst uten pil og kan ikke trykkes. Da er velgeren aldri i veien.

## Skjermer i første versjon

| # | Skjerm | Hovedhandling |
|---|---|---|
| 1 | Velkommen | Opprett bruker (sekundær: Logg inn) |
| 2 | Ingen hytte ennå | Opprett hytte (sekundær: Jeg har fått en invitasjonslenke) |
| 3 | Bli med i [hyttenavn] | Bli med |
| 4 | Hjem | Noe som mangler eller må fikses? |
| 5 | Gjøremål | Nytt gjøremål. Filter: Alle · Gjøremål · Vedlikehold |
| 6 | Feil og mangler | Meld feil. Status: Ny, Pågår, Fikset |
| 7 | Handleliste | Hurtiginnlegging øverst, avkryssing gir «Kjøpt av» |
| 8 | Dokumenter og manualer | Last opp |
| 9 | Info og koder | Kopier |
| 10 | Ankomst- og avreisesjekkliste | Kryss av; «Ferdig» når alt er krysset |
| 11 | Medlemmer | Inviter (bare admin) |
| 12 | Mine hytter | Opprett ny hytte |

## Skjemaregler

- Opprett bruker: e-post, passord og gjenta passord. Begge passordfeltene har øye. Feilmeldingen om ulike passord vises under det andre feltet når du trykker «Opprett bruker», og forsvinner så snart feltene er like.
- Logg inn: e-post og ett passordfelt med øye, «Glemt passord?» som `ha-btn-ghost` under feltet. Man forblir innlogget.
- Meld feil: «Ta bilde» åpner kameraet direkte. Bildet vises stort i skjemaet med «Ta nytt bilde». Deretter tittel og beskrivelse (valgfri).

## Senere versjoner

Kalender (dugnad, perioder hytta er utilgjengelig), historikk (når ting sist ble gjort: maling, kledning) og push-varsler. De har plass under Mer, men designes ikke ennå.
