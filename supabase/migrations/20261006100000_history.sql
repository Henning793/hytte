-- Historikk: når ting ble gjort på hytta (malt, ny kledning, tømt septik …).
-- Fullførte gjøremål og fiksede feil vises også i historikken; de hentes fra
-- sine egne tabeller. Her ligger det medlemmene skriver inn selv.

create table public.history_entries (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins (id) on delete cascade,
  happened_on date not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  photo_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index history_entries_cabin_idx on public.history_entries (cabin_id, happened_on desc);

create trigger protect_row before update on public.history_entries
  for each row execute function public.protect_row();

alter table public.history_entries enable row level security;
revoke all on public.history_entries from anon;

create policy "Medlemmer ser historikken" on public.history_entries
  for select to authenticated using (public.is_member(cabin_id));
create policy "Medlemmer skriver i historikken" on public.history_entries
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer historikken" on public.history_entries
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier eller admin sletter fra historikken" on public.history_entries
  for delete to authenticated
  using (public.is_member(cabin_id) and (created_by = (select auth.uid()) or public.is_admin(cabin_id)));
