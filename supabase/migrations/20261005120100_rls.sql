-- Hytteappen: tilgangsregler (RLS) og RPC-funksjoner.
-- Se docs/HANDOVER.md, avsnitt 3 og 5.

-- ---------------------------------------------------------------------------
-- Hjelpefunksjoner for RLS
-- ---------------------------------------------------------------------------

create or replace function public.is_member(p_cabin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cabin_members
    where cabin_id = p_cabin_id and user_id = auth.uid()
  )
$$;

create or replace function public.is_admin(p_cabin_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cabin_members
    where cabin_id = p_cabin_id and user_id = auth.uid() and role = 'admin'
  )
$$;

-- Er brukeren med i minst én hytte sammen med meg?
create or replace function public.shares_cabin_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cabin_members mine
    join public.cabin_members theirs on theirs.cabin_id = mine.cabin_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS på alle tabeller
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cabins enable row level security;
alter table public.cabin_members enable row level security;
alter table public.cabin_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.issues enable row level security;
alter table public.shopping_items enable row level security;
alter table public.documents enable row level security;
alter table public.cabin_info enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_runs enable row level security;

-- Ikke-innloggede får ingenting.
revoke all on all tables in schema public from anon;

-- profiles: meg selv og de jeg deler hytte med.
create policy "Se egen profil og hyttenaboer" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_cabin_with(id));
create policy "Opprette egen profil" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "Endre egen profil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- cabins: opprettes med create_cabin(). Admin endrer og sletter.
create policy "Medlemmer ser hytta" on public.cabins
  for select to authenticated
  using (public.is_member(id));
create policy "Admin endrer hytta" on public.cabins
  for update to authenticated
  using (public.is_admin(id))
  with check (public.is_admin(id));
create policy "Admin sletter hytta" on public.cabins
  for delete to authenticated
  using (public.is_admin(id));

-- cabin_members: legges til med create_cabin() og join_cabin().
create policy "Medlemmer ser hverandre" on public.cabin_members
  for select to authenticated
  using (public.is_member(cabin_id));
create policy "Admin endrer roller" on public.cabin_members
  for update to authenticated
  using (public.is_admin(cabin_id))
  with check (public.is_admin(cabin_id));
create policy "Admin fjerner medlemmer" on public.cabin_members
  for delete to authenticated
  using (public.is_admin(cabin_id));

-- cabin_invites: bare admin ser lenken. Ny lenke lages med new_invite_link().
create policy "Admin ser invitasjonslenken" on public.cabin_invites
  for select to authenticated
  using (public.is_admin(cabin_id));

-- tasks, issues, documents: medlemmer gjør alt, men bare eier og admin sletter.
create policy "Medlemmer ser gjøremål" on public.tasks
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer lager gjøremål" on public.tasks
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer gjøremål" on public.tasks
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier eller admin sletter gjøremål" on public.tasks
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_admin(cabin_id));

create policy "Medlemmer ser feil" on public.issues
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer melder feil" on public.issues
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer feil" on public.issues
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier eller admin sletter feil" on public.issues
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_admin(cabin_id));

create policy "Medlemmer ser dokumenter" on public.documents
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer laster opp dokumenter" on public.documents
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer dokumenter" on public.documents
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier eller admin sletter dokumenter" on public.documents
  for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_admin(cabin_id));

-- shopping_items: som over, men alle kan fjerne kjøpte varer.
create policy "Medlemmer ser handlelisten" on public.shopping_items
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer legger til varer" on public.shopping_items
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer varer" on public.shopping_items
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier, admin eller kjøpt vare kan slettes" on public.shopping_items
  for delete to authenticated
  using (
    public.is_member(cabin_id)
    and (done or created_by = (select auth.uid()) or public.is_admin(cabin_id))
  );

-- cabin_info: alle medlemmer leser og redigerer.
create policy "Medlemmer ser info" on public.cabin_info
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer lager info" on public.cabin_info
  for insert to authenticated with check (public.is_member(cabin_id));
create policy "Medlemmer endrer info" on public.cabin_info
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));

-- checklist_items: medlemmer leser, admin redigerer.
create policy "Medlemmer ser sjekklisten" on public.checklist_items
  for select to authenticated using (public.is_member(cabin_id));
create policy "Admin legger til punkter" on public.checklist_items
  for insert to authenticated
  with check (public.is_admin(cabin_id) and created_by = (select auth.uid()));
create policy "Admin endrer punkter" on public.checklist_items
  for update to authenticated
  using (public.is_admin(cabin_id)) with check (public.is_admin(cabin_id));
create policy "Admin fjerner punkter" on public.checklist_items
  for delete to authenticated using (public.is_admin(cabin_id));

-- checklist_runs: medlemmer logger gjennomganger, admin kan slette.
create policy "Medlemmer ser gjennomganger" on public.checklist_runs
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer logger gjennomgang" on public.checklist_runs
  for insert to authenticated
  with check (public.is_member(cabin_id) and completed_by = (select auth.uid()));
create policy "Admin sletter gjennomganger" on public.checklist_runs
  for delete to authenticated using (public.is_admin(cabin_id));

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Opprett hytte. Den som oppretter blir admin, og hytta får invitasjonslenke
-- og tom info-side.
create or replace function public.create_cabin(p_name text, p_id uuid default gen_random_uuid())
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Du må være innlogget.' using errcode = '42501';
  end if;

  insert into public.cabins (id, name, created_by) values (p_id, btrim(p_name), v_uid);
  insert into public.cabin_members (cabin_id, user_id, role) values (p_id, v_uid, 'admin');
  insert into public.cabin_invites (cabin_id, created_by) values (p_id, v_uid);
  insert into public.cabin_info (cabin_id) values (p_id);
  return p_id;
end;
$$;

-- Det «Bli med i [hyttenavn]» viser, før man har blitt med.
create or replace function public.invite_preview(p_token text)
returns table (cabin_id uuid, cabin_name text, invited_by text, member_count integer, already_member boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    p.first_name,
    (select count(*)::integer from public.cabin_members m where m.cabin_id = c.id),
    public.is_member(c.id)
  from public.cabin_invites i
  join public.cabins c on c.id = i.cabin_id
  left join public.profiles p on p.id = i.created_by
  where i.token = p_token and auth.uid() is not null
$$;

-- Bli med via lenke. Gir en feil med hint 'invalid_token' hvis lenken ikke virker.
create or replace function public.join_cabin(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cabin uuid;
begin
  if v_uid is null then
    raise exception 'Du må være innlogget.' using errcode = '42501';
  end if;

  select cabin_id into v_cabin from public.cabin_invites where token = p_token;
  if v_cabin is null then
    raise exception 'Invitasjonslenken virker ikke lenger.' using errcode = 'P0002', hint = 'invalid_token';
  end if;

  insert into public.cabin_members (cabin_id, user_id, role)
  values (v_cabin, v_uid, 'member')
  on conflict do nothing;
  return v_cabin;
end;
$$;

-- «Lag ny lenke»: ny kode, og den gamle slutter å virke.
create or replace function public.new_invite_link(p_cabin_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not public.is_admin(p_cabin_id) then
    raise exception 'Bare admin kan lage ny lenke.' using errcode = '42501';
  end if;

  insert into public.cabin_invites (cabin_id, token, created_by, created_at)
  values (p_cabin_id, public.new_invite_token(), auth.uid(), now())
  on conflict (cabin_id) do update
    set token = excluded.token, created_by = excluded.created_by, created_at = excluded.created_at
  returning token into v_token;
  return v_token;
end;
$$;

-- Funksjonene skal bare kunne kalles av innloggede brukere.
revoke execute on function
  public.is_member(uuid), public.is_admin(uuid), public.shares_cabin_with(uuid),
  public.create_cabin(text, uuid), public.invite_preview(text), public.join_cabin(text),
  public.new_invite_link(uuid), public.new_invite_token(), public.handle_new_user(),
  public.keep_one_admin()
from public, anon;
grant execute on function
  public.is_member(uuid), public.is_admin(uuid), public.shares_cabin_with(uuid),
  public.create_cabin(text, uuid), public.invite_preview(text), public.join_cabin(text),
  public.new_invite_link(uuid)
to authenticated;
