-- Alle medlemmer kan legge til sjekklistepunkter og endre rekkefølgen.
-- Slette kan den som la inn punktet, og admin (samme regel som ellers i appen).
drop policy "Admin legger til punkter" on public.checklist_items;
drop policy "Admin endrer punkter" on public.checklist_items;
drop policy "Admin fjerner punkter" on public.checklist_items;

create policy "Medlemmer legger til punkter" on public.checklist_items
  for insert to authenticated
  with check (public.is_member(cabin_id) and created_by = (select auth.uid()));
create policy "Medlemmer endrer punkter" on public.checklist_items
  for update to authenticated
  using (public.is_member(cabin_id)) with check (public.is_member(cabin_id));
create policy "Eier og admin fjerner punkter" on public.checklist_items
  for delete to authenticated
  using (public.is_member(cabin_id) and (created_by = (select auth.uid()) or public.is_admin(cabin_id)));
