-- Push-varsler. Av til hver person slår dem på (per enhet) under Mer > Varsler.
--
-- Slik henger det sammen:
--   1. Appen lagrer enhetens push-abonnement i push_subscriptions.
--   2. Når noe nytt legges inn (feil, hendelse, opphold, gjøremål), kaller en
--      trigger Edge Function «push» via pg_net.
--   3. Hver dag kl. 12 norsk tid kaller pg_cron den samme funksjonen for å minne om
--      hendelser og egne opphold som starter i morgen.
--   4. Funksjonen finner mottakerne (alle i hytta unntatt den som gjorde det,
--      og som har den typen varsel på) og sender.
--
-- Nøklene ligger i Supabase Vault, ikke i koden:
--   push_url          https://<ref>.supabase.co/functions/v1/push
--   push_secret       tilfeldig streng som beviser at kallet kommer fra databasen
--   push_vapid_public / push_vapid_private / push_vapid_subject
-- Mangler de, eller mangler pg_net, sendes ingenting, men alt annet virker.

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------

-- Én rad per enhet som har slått på varsler.
create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%'),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Hvilke varsler personen vil ha. Ingen rad betyr standardvalgene under.
-- Gjelder alle hyttene og alle enhetene til personen.
create table public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade default auth.uid(),
  issues boolean not null default true,
  events boolean not null default true,
  reminders boolean not null default true,
  -- Dagen før mitt eget opphold starter: sjekk handleliste og gjøremål før avreise.
  trip boolean not null default true,
  stays boolean not null default false,
  tasks boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
revoke all on public.push_subscriptions, public.notification_prefs from anon;

create policy "Ser egne abonnement" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Sletter egne abonnement" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));
-- Lagres via save_push_subscription(), så ingen insert/update-regler her.

create policy "Ser egne varselvalg" on public.notification_prefs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Lagrer egne varselvalg" on public.notification_prefs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Endrer egne varselvalg" on public.notification_prefs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.touch_notification_prefs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := old.user_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_notification_prefs before update on public.notification_prefs
  for each row execute function public.touch_notification_prefs();

-- ---------------------------------------------------------------------------
-- RPC for appen
-- ---------------------------------------------------------------------------

-- Lagrer enhetens abonnement på meg. Logget noen andre inn på samme telefon
-- før, tar jeg over abonnementet, så de ikke får varslene mine.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Ikke innlogget' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
end;
$$;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- Den offentlige VAPID-nøkkelen appen trenger for å abonnere. Null før den er satt opp.
create or replace function public.push_public_key()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return null;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public'$q$ into v_key;
  return v_key;
end;
$$;
revoke execute on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Alle nøklene, bare for Edge Function (service_role).
create or replace function public.push_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if to_regclass('vault.decrypted_secrets') is null then
    return '{}'::jsonb;
  end if;
  execute $q$
    select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
    from vault.decrypted_secrets
    where name in ('push_secret', 'push_vapid_public', 'push_vapid_private', 'push_vapid_subject')
  $q$ into v;
  return v;
end;
$$;
revoke execute on function public.push_settings() from public, anon, authenticated;
grant execute on function public.push_settings() to service_role;

-- ---------------------------------------------------------------------------
-- Utsending
-- ---------------------------------------------------------------------------

-- Ber Edge Function «push» om å sende. Feiler aldri: et varsel som ikke går ut,
-- skal ikke stoppe at feilen eller hendelsen blir lagret.
create or replace function public.request_push(p_body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if to_regnamespace('net') is null or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'push_url'$q$ into v_url;
  execute $q$select decrypted_secret from vault.decrypted_secrets where name = 'push_secret'$q$ into v_secret;
  if v_url is null or v_secret is null then
    return;
  end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 10000)'
    using v_url, p_body, jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret);
exception when others then
  raise warning 'Push-varsel ble ikke sendt: %', sqlerrm;
end;
$$;
revoke execute on function public.request_push(jsonb) from public, anon, authenticated;

create or replace function public.push_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.request_push(jsonb_build_object('table', tg_table_name, 'id', new.id));
  return null;
end;
$$;
revoke execute on function public.push_on_insert() from public, anon, authenticated;

create trigger push_on_insert after insert on public.issues
  for each row execute function public.push_on_insert();
create trigger push_on_insert after insert on public.calendar_events
  for each row execute function public.push_on_insert();
create trigger push_on_insert after insert on public.stays
  for each row execute function public.push_on_insert();
create trigger push_on_insert after insert on public.tasks
  for each row execute function public.push_on_insert();

-- pg_net og pg_cron finnes på Supabase, men ikke i testdatabasen i CI.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- Påminnelse om hendelser i morgen, kl. 18 norsk sommertid (17 vintertid).
    perform cron.schedule('push-paminnelser', '0 16 * * *', $c$select public.request_push('{"kind": "reminders"}')$c$);
  end if;
end;
$$;
