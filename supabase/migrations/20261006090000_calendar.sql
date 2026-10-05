-- Kalender: hvem som er på hytta (opphold), felles hendelser (dugnad o.l.)
-- og en farge per person. Helligdager regnes ut i appen og lagres ikke.

-- Farge per person. Tom betyr at appen velger en automatisk.
alter table public.profiles
  add column color text check (color ~ '^#[0-9a-f]{6}$');

-- Opphold: «Kari er på hytta 10.–14. okt.». Flere kan være der samtidig.
-- Gjelder enten et medlem (user_id) eller noen som ikke bruker appen (guest_name, f.eks. «Mormor»).
create table public.stays (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_name text check (char_length(btrim(guest_name)) between 1 and 60),
  start_date date not null,
  end_date date not null,
  note text check (char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check ((user_id is null) <> (guest_name is null))
);
create index stays_cabin_idx on public.stays (cabin_id, start_date);

-- Felles hendelser: dugnad, høstferie, «hytta er utleid» …
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  start_date date not null,
  end_date date not null,
  start_time time,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index calendar_events_cabin_idx on public.calendar_events (cabin_id, start_date);

create trigger protect_row before update on public.stays
  for each row execute function public.protect_row();
create trigger protect_row before update on public.calendar_events
  for each row execute function public.protect_row();

alter table public.stays enable row level security;
alter table public.calendar_events enable row level security;
revoke all on public.stays, public.calendar_events from anon;

-- Er brukeren medlem av hytta? (For å legge inn opphold for andre i hytta.)
create or replace function public.is_cabin_member(p_cabin_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cabin_members
    where cabin_id = p_cabin_id and user_id = p_user_id
  )
$$;
revoke execute on function public.is_cabin_member(uuid, uuid) from public, anon;
grant execute on function public.is_cabin_member(uuid, uuid) to authenticated;

-- stays: alle medlemmer legger inn og endrer. Den som la inn oppholdet,
-- den oppholdet gjelder, og admin kan slette.
create policy "Medlemmer ser opphold" on public.stays
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer legger inn opphold" on public.stays
  for insert to authenticated
  with check (
    public.is_member(cabin_id)
    and created_by = (select auth.uid())
    and (user_id is null or public.is_cabin_member(cabin_id, user_id))
  );
create policy "Medlemmer endrer opphold" on public.stays
  for update to authenticated
  using (public.is_member(cabin_id))
  with check (public.is_member(cabin_id) and (user_id is null or public.is_cabin_member(cabin_id, user_id)));
create policy "Eier eller admin sletter opphold" on public.stays
  for delete to authenticated
  using (
    public.is_member(cabin_id)
    and (created_by = (select auth.uid()) or user_id = (select auth.uid()) or public.is_admin(cabin_id))
  );

-- calendar_events: som gjøremål.
create policy "Medlemmer ser hendelser" on public.calendar_events
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer legger til hendelser" on public.calendar_events
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer hendelser" on public.calendar_events
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier eller admin sletter hendelser" on public.calendar_events
  for delete to authenticated
  using (public.is_member(cabin_id) and (created_by = (select auth.uid()) or public.is_admin(cabin_id)));
