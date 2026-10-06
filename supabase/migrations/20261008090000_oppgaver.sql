-- Oppgaver: feil, gjøremål og vedlikehold blir én liste.
--
-- Før: tasks (kind gjoremal | vedlikehold) og issues (status ny | pagar | fikset).
-- Etter: alt ligger i tasks, med kind oppgave | feil. Feil kan ha bilde.
--
-- Eksisterende feil flyttes over med samme id, tittel, beskrivelse, bilde,
-- hvem som meldte og når. «Fikset» blir gjort (tidspunktet er siste endring),
-- «Ny» og «Pågår» blir åpne. Gjøremål og vedlikehold blir vanlige oppgaver.
--
-- issues-tabellen blir stående tom en stund: telefoner som har den gamle
-- appen, eller som meldte en feil uten nett, sender fortsatt dit. Nye feil
-- derfra havner i tasks.

alter table public.tasks add column photo_path text;

-- Uten triggere mens dataene flyttes: ingen varsler for gamle feil,
-- og «gjort av» og tidspunktene blir stående som de var.
alter table public.tasks disable trigger user;

alter table public.tasks drop constraint tasks_kind_check;
update public.tasks set kind = 'oppgave';
alter table public.tasks alter column kind set default 'oppgave';
alter table public.tasks add constraint tasks_kind_check check (kind in ('oppgave', 'feil'));

insert into public.tasks (id, cabin_id, title, description, kind, photo_path, done, done_at, created_by, created_at, updated_at)
select id, cabin_id, title, description, 'feil', photo_path, status = 'fikset',
       case when status = 'fikset' then updated_at end, created_by, created_at, updated_at
from public.issues
on conflict (id) do nothing;

delete from public.issues;

alter table public.tasks enable trigger user;

-- Den gamle appen sender gjoremal og vedlikehold; de blir oppgaver.
create or replace function public.normalize_task_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind in ('gjoremal', 'vedlikehold') then
    new.kind := 'oppgave';
  end if;
  return new;
end;
$$;
revoke execute on function public.normalize_task_kind() from public, anon, authenticated;

create trigger normalize_task_kind before insert or update on public.tasks
  for each row execute function public.normalize_task_kind();

-- Feil meldt fra den gamle appen blir en oppgave merket som feil.
-- Kjøres som den som meldte, så reglene for tasks gjelder som vanlig.
create or replace function public.issue_to_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tasks (id, cabin_id, title, description, kind, photo_path, created_by, created_at)
  values (new.id, new.cabin_id, new.title, new.description, 'feil', new.photo_path, new.created_by, new.created_at)
  on conflict (id) do nothing;
  return null;
end;
$$;
revoke execute on function public.issue_to_task() from public, anon, authenticated;

drop trigger push_on_insert on public.issues;
create trigger issue_to_task before insert on public.issues
  for each row execute function public.issue_to_task();
