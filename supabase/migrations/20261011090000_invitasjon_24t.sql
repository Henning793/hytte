-- Invitasjonslenken virker bare i 24 timer fra den ble laget eller fornyet.
-- Lenker som finnes fra før får 24 timer fra nå (default regnes ut én gang per rad).
alter table public.cabin_invites
  add column if not exists expires_at timestamptz not null default now() + interval '24 hours';

-- «Lag ny lenke»: ny kode som virker i 24 timer, og den gamle slutter å virke.
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

  insert into public.cabin_invites (cabin_id, token, created_by, created_at, expires_at)
  values (p_cabin_id, public.new_invite_token(), auth.uid(), now(), now() + interval '24 hours')
  on conflict (cabin_id) do update
    set token = excluded.token, created_by = excluded.created_by,
        created_at = excluded.created_at, expires_at = excluded.expires_at
  returning token into v_token;
  return v_token;
end;
$$;

-- Forhåndsvisningen sier også om lenken er utløpt, så «Bli med»-siden kan si det tydelig.
-- Returtypen endres, så funksjonen må slettes og lages på nytt.
drop function public.invite_preview(text);
create function public.invite_preview(p_token text)
returns table (cabin_id uuid, cabin_name text, invited_by text, member_count integer, already_member boolean, expired boolean)
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
    public.is_member(c.id),
    i.expires_at <= now()
  from public.cabin_invites i
  join public.cabins c on c.id = i.cabin_id
  left join public.profiles p on p.id = i.created_by
  where i.token = p_token and auth.uid() is not null
$$;
revoke execute on function public.invite_preview(text) from public, anon;
grant execute on function public.invite_preview(text) to authenticated;

-- Bli med via lenke. Feil med hint 'invalid_token' hvis koden er ukjent,
-- og 'expired_token' hvis lenken er eldre enn 24 timer.
create or replace function public.join_cabin(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cabin uuid;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'Du må være innlogget.' using errcode = '42501';
  end if;

  select cabin_id, expires_at into v_cabin, v_expires from public.cabin_invites where token = p_token;
  if v_cabin is null then
    raise exception 'Invitasjonslenken virker ikke lenger.' using errcode = 'P0002', hint = 'invalid_token';
  end if;

  -- Den som allerede er med, kommer inn uansett (ingenting endres).
  if v_expires <= now() and not public.is_member(v_cabin) then
    raise exception 'Invitasjonslenken er utløpt.' using errcode = 'P0002', hint = 'expired_token';
  end if;

  insert into public.cabin_members (cabin_id, user_id, role)
  values (v_cabin, v_uid, 'member')
  on conflict do nothing;
  return v_cabin;
end;
$$;
