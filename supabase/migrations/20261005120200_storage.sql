-- Hytteappen: privat bucket for bilder og dokumenter.
-- Stier: {cabin_id}/{type}/{uuid}.{ext}, f.eks. 3f2c…/issues/9a1b….jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cabin-files',
  'cabin-files',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Medlemmer ser hyttas filer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cabin-files'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "Medlemmer laster opp filer" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cabin-files'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "Medlemmer erstatter filer" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cabin-files'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'cabin-files'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "Eier eller admin sletter filer" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cabin-files'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
    and (
      owner_id = (select auth.uid())::text
      or public.is_admin(public.try_uuid((storage.foldername(name))[1]))
    )
  );
