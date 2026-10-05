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

## Oppsett som må gjøres én gang

1. **Supabase:** opprett et gratis prosjekt. Under *Project Settings → API* finner du `Project URL` og `anon public`-nøkkelen.
2. **Netlify:** *Add new site → Import from GitHub* og velg dette repoet. Bygg-innstillingene leses fra `netlify.toml`. Legg inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` under *Site configuration → Environment variables*.
3. **Supabase Auth:** legg Netlify-adressen (`https://<navn>.netlify.app`) inn som *Site URL* og under *Redirect URLs* (*Authentication → URL Configuration*), så «Glemt passord»-lenker virker.

Anon-nøkkelen er laget for å ligge i nettleseren. Sikkerheten ligger i Row Level Security i databasen. `service_role`-nøkkelen skal aldri inn i appen, Netlify eller repoet.
