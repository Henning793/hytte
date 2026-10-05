# Hytteappen

En mobil-først PWA der familier som deler en hytte samarbeider om det praktiske: gjøremål og vedlikehold, feil og mangler, felles handleliste, dokumenter, info og koder, og sjekkliste for ankomst og avreise.

- Hva som skal bygges og i hvilken rekkefølge: [docs/HANDOVER.md](docs/HANDOVER.md)
- Design: [docs/design/](docs/design/) (designsystem, navigasjon, tokens og prototype)

## Teknikk

React + TypeScript + Vite, `vite-plugin-pwa`, Supabase (Postgres, Auth, Storage, RLS) og Netlify.

## Kom i gang lokalt

Krever Node 22 (se `.nvmrc`).

```sh
npm install
cp .env.example .env.local   # fyll inn Supabase-URL og anon-nøkkel
npm run dev
```

| Kommando | Hva den gjør |
|---|---|
| `npm run dev` | Utviklingsserver |
| `npm run build` | Typecheck og produksjonsbygg til `dist/` |
| `npm run preview` | Server `dist/` lokalt (med service worker) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run icons` | Lager PNG-ikoner fra `public/favicon.svg` |
| `npm run test:db` | Kjører migrasjonene og RLS-testene mot en tom Postgres (krever `DATABASE_URL`) |

## Oppsett som må gjøres én gang

1. **Supabase:** opprett et gratis prosjekt. Under *Project Settings → API* finner du `Project URL` og `anon public`-nøkkelen.
2. **Netlify:** *Add new site → Import from GitHub* og velg dette repoet. Bygg-innstillingene leses fra `netlify.toml`. Legg inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` under *Site configuration → Environment variables*.
3. **Database:** kjør migrasjonene i `supabase/migrations/` i rekkefølge, enten med Supabase CLI (`supabase link --project-ref <ref>` og `supabase db push`) eller ved å lime dem inn i *SQL Editor*.
4. **Supabase Auth:** under *Authentication → Providers → Email*: skru av *Confirm email*, og sett *Minimum password length* til 8.
5. **Supabase Auth:** legg Netlify-adressen (`https://<navn>.netlify.app`) inn som *Site URL* og under *Redirect URLs* (*Authentication → URL Configuration*), så «Glemt passord»-lenker virker.

Anon-nøkkelen er laget for å ligge i nettleseren. Sikkerheten ligger i Row Level Security i databasen. `service_role`-nøkkelen skal aldri inn i appen, Netlify eller repoet.

## Database og tilgang

Alle tabeller har Row Level Security. Kort fortalt:

- Bare medlemmer av en hytte ser og endrer noe i den. Ikke-innloggede ser ingenting.
- Bare den som opprettet noe, og admin, kan slette det. Unntak: kjøpte varer kan fjernes av alle.
- Bare admin ser invitasjonslenken, lager ny lenke og fjerner medlemmer.
- Alle medlemmer kan legge til sjekklistepunkter, endre teksten og endre rekkefølgen. Punkter fjernes av den som la dem inn, eller admin.
- Hytter opprettes med `create_cabin(navn)`, man blir med med `join_cabin(kode)`, og «Bli med»-skjermen bruker `invite_preview(kode)`.
- Filer ligger i den private bucketen `cabin-files` under `{cabin_id}/…`, og bare hyttas medlemmer slipper til.

`supabase/tests/rls_test.sql` beviser reglene og kjøres i CI mot en vanlig Postgres med en liten etterligning av Supabase (`supabase/tests/supabase_shim.sql`).

## Uten nett

- Service workeren cacher selve appen, så den åpner uten nett.
- Siste kjente lister (gjøremål, feil, handleliste, dokumentliste, info og koder, sjekklister, medlemmer) lagres i IndexedDB og vises med en gang (`src/lib/data.ts`).
- Alle endringer vises lokalt med en gang og legges i en utboks som lagres i IndexedDB og sendes i rekkefølge når det er nett. Bilder venter i utboksen som filer. Hvis serveren avviser en endring som ble gjort uten nett, vises en melding og listen hentes på nytt.
- Bilder og PDF-er som er åpnet før, lagres og kan åpnes igjen uten nett.
- Ved utlogging slettes alt som er lagret på telefonen, også endringer som ikke er sendt.

Test: åpne appen, gå gjennom skjermene, slå av nettet i DevTools (*Network → Offline*) og last siden på nytt.

## Push-varsler

Av for alle til hver person selv slår dem på under *Mer → Varsler* (per telefon/PC). Standardvalg når de slås på: ny feil, ny hendelse i kalenderen og påminnelse dagen før en hendelse. «Noen skal på hytta» og «Nytt gjøremål» kan slås på. Man får aldri varsel om noe man har gjort selv. På iPhone må appen være lagt til på hjemskjermen.

Slik virker det (`supabase/migrations/20261007090000_push.sql`):

- Appen lagrer enhetens abonnement med `save_push_subscription()` og valgene i `notification_prefs`.
- Når noe nytt legges inn, kaller en trigger Edge Function `push` (`supabase/functions/push/`) via `pg_net`. Hver dag kl. 16 UTC kaller `pg_cron` den samme funksjonen for påminnelser.
- Funksjonen henter nøklene fra Vault med `push_settings()` og sender med Web Push.

Oppsett én gang (ingen miljøvariabler i Netlify trengs):

1. Lag VAPID-nøkler: `npx web-push generate-vapid-keys`.
2. Kjør migrasjonen, og legg nøklene i Vault (*SQL Editor*):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co/functions/v1/push', 'push_url');
   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_secret');
   select vault.create_secret('<public key>', 'push_vapid_public');
   select vault.create_secret('<private key>', 'push_vapid_private');
   select vault.create_secret('mailto:<din e-post>', 'push_vapid_subject');
   ```
3. Rull ut funksjonen uten JWT-sjekk (den sjekker `x-push-secret` selv): `supabase functions deploy push --no-verify-jwt`.

Mangler noe av dette, lagres alt som før, men ingen varsler sendes.
