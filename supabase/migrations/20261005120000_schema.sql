-- Hytteappen: tabeller, hjelpefunksjoner og triggere.
-- RLS-reglene ligger i neste migrasjon, storage i den etter.

-- ---------------------------------------------------------------------------
-- Hjelpere
-- ---------------------------------------------------------------------------

-- Tilfeldig, URL-trygg invitasjonskode (24 tegn, 144 bit).
create or replace function public.new_invite_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_')
$$;

-- Tåler tekst som ikke er en UUID (brukes på mappenavn i storage).
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Brukere og hytter
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 50),
  created_at timestamptz not null default now()
);

create table public.cabins (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  photo_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cabin_members (
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (cabin_id, user_id)
);
create index cabin_members_user_idx on public.cabin_members (user_id);

-- Invitasjonslenken ligger i egen tabell, så bare admin kan lese den.
create table public.cabin_invites (
  cabin_id uuid primary key references public.cabins (id) on delete cascade,
  token text not null unique default public.new_invite_token(),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Innhold
-- ---------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  kind text not null default 'gjoremal' check (kind in ('gjoremal', 'vedlikehold')),
  responsible_user_id uuid references public.profiles (id) on delete set null,
  due_date date,
  done boolean not null default false,
  done_by uuid references public.profiles (id) on delete set null,
  done_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_cabin_idx on public.tasks (cabin_id);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  status text not null default 'ny' check (status in ('ny', 'pagar', 'fikset')),
  photo_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index issues_cabin_idx on public.issues (cabin_id);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  done boolean not null default false,
  bought_by uuid references public.profiles (id) on delete set null,
  bought_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shopping_items_cabin_idx on public.shopping_items (cabin_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  category text not null check (category in ('manualer', 'dokumenter')),
  file_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 0 and 20971520),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_cabin_idx on public.documents (cabin_id);

create table public.cabin_info (
  cabin_id uuid primary key references public.cabins (id) on delete cascade,
  wifi_name text,
  wifi_password text,
  keybox_code text,
  keybox_location text,
  trash_info text,
  store_info text,
  notes text,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  kind text not null check (kind in ('ankomst', 'avreise')),
  text text not null check (char_length(btrim(text)) between 1 and 200),
  hint text,
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checklist_items_cabin_idx on public.checklist_items (cabin_id, kind, position);

create table public.checklist_runs (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  kind text not null check (kind in ('ankomst', 'avreise')),
  completed_by uuid references public.profiles (id) on delete set null default auth.uid(),
  completed_at timestamptz not null default now()
);
create index checklist_runs_cabin_idx on public.checklist_runs (cabin_id, kind, completed_at desc);

-- ---------------------------------------------------------------------------
-- Triggere
-- ---------------------------------------------------------------------------

-- Ny bruker i Supabase Auth får profil med fornavnet fra registreringen
-- (supabase.auth.signUp({ options: { data: { first_name } } })).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'first_name'), ''), split_part(new.email, '@', 1), 'Ukjent')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hvem som opprettet noe, og i hvilken hytte, kan ikke endres i etterkant.
-- Ellers kunne et medlem gjort seg selv til eier og fått lov til å slette.
create or replace function public.protect_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cabin_id := old.cabin_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_row before update on public.tasks
  for each row execute function public.protect_row();
create trigger protect_row before update on public.issues
  for each row execute function public.protect_row();
create trigger protect_row before update on public.shopping_items
  for each row execute function public.protect_row();
create trigger protect_row before update on public.documents
  for each row execute function public.protect_row();
create trigger protect_row before update on public.checklist_items
  for each row execute function public.protect_row();

create or replace function public.protect_cabin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_cabin before update on public.cabins
  for each row execute function public.protect_cabin();

create or replace function public.touch_cabin_info()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.cabin_id := old.cabin_id;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_cabin_info before insert or update on public.cabin_info
  for each row execute function public.touch_cabin_info();

-- Avkryssing: serveren fyller inn hvem som gjorde det.
create or replace function public.set_task_done()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_by := auth.uid();
    new.done_at := coalesce(new.done_at, now());
  elsif not new.done then
    new.done_by := null;
    new.done_at := null;
  elsif tg_op = 'UPDATE' then
    new.done_by := old.done_by;
    new.done_at := old.done_at;
  end if;
  return new;
end;
$$;

create trigger set_task_done before insert or update on public.tasks
  for each row execute function public.set_task_done();

create or replace function public.set_item_bought()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.bought_by := auth.uid();
    new.bought_at := coalesce(new.bought_at, now());
  elsif not new.done then
    new.bought_by := null;
    new.bought_at := null;
  elsif tg_op = 'UPDATE' then
    new.bought_by := old.bought_by;
    new.bought_at := old.bought_at;
  end if;
  return new;
end;
$$;

create trigger set_item_bought before insert or update on public.shopping_items
  for each row execute function public.set_item_bought();

-- En hytte må alltid ha minst én admin.
create or replace function public.keep_one_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (
       select 1 from public.cabin_members
       where cabin_id = old.cabin_id and role = 'admin' and user_id <> old.user_id
     )
     -- Når hele hytta slettes, forsvinner medlemmene også.
     and exists (select 1 from public.cabins where id = old.cabin_id)
  then
    raise exception 'Hytta må ha minst én admin.' using errcode = 'P0001', hint = 'last_admin';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger keep_one_admin before update or delete on public.cabin_members
  for each row execute function public.keep_one_admin();

-- Medlemskap: bare rollen kan endres.
create or replace function public.protect_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.cabin_id := old.cabin_id;
  new.user_id := old.user_id;
  new.joined_at := old.joined_at;
  return new;
end;
$$;

create trigger protect_member before update on public.cabin_members
  for each row execute function public.protect_member();
