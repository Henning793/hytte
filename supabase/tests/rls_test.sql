-- Beviser at tilgangsreglene holder. Kjøres av scripts/test-db.sh.
-- Hver sjekk skriver «ok - …», og første brudd stopper skriptet med «FEIL: …».
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

-- ---------------------------------------------------------------------------
-- Testhjelpere
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, false)
$$;

create function tests.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FEIL: %', p_msg;
  end if;
  raise notice 'ok - %', p_msg;
end;
$$;

-- Antall rader en spørring gir.
create function tests.rows(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end;
$$;

-- Antall rader en insert/update/delete faktisk traff.
create function tests.affected(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Setningen skal feile.
create function tests.fails(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok - % (%)', p_msg, sqlerrm;
    return;
  end;
  raise exception 'FEIL: % (setningen gikk gjennom)', p_msg;
end;
$$;

-- Leser invitasjonskoden uten RLS, bare for testene.
create function tests.token(p_cabin uuid) returns text language sql security definer as $$
  select token from public.cabin_invites where cabin_id = p_cabin
$$;

create function tests.count_as_owner(p_sql text) returns bigint language plpgsql security definer as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Brukere og hytter
-- ---------------------------------------------------------------------------
-- Ola og Kari deler Furulia (A). Per har Fjellbu (B). Eve er ikke med noe sted.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ola@example.com',  '{"first_name":"Ola"}'),
  ('00000000-0000-0000-0000-00000000000b', 'kari@example.com', '{"first_name":"Kari"}'),
  ('00000000-0000-0000-0000-00000000000c', 'per@example.com',  '{"first_name":"Per"}'),
  ('00000000-0000-0000-0000-00000000000d', 'eve@example.com',  '{}');

select tests.ok((select first_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Ola',
  'ny bruker får profil med fornavn');
select tests.ok((select first_name from public.profiles where id = '00000000-0000-0000-0000-00000000000d') = 'eve',
  'uten fornavn brukes starten av e-posten');

set role authenticated;

-- Ola oppretter Furulia
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(public.create_cabin('Furulia', 'aaaaaaaa-0000-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000001',
  'create_cabin gir hyttas id');
select tests.ok(tests.rows($$select 1 from cabin_members where user_id = auth.uid() and role = 'admin'$$) = 1,
  'den som oppretter blir admin');
select tests.ok(tests.rows('select 1 from cabin_invites') = 1, 'admin ser invitasjonslenken');
select tests.ok(tests.rows('select 1 from cabin_info') = 1, 'hytta får tom info-side');
select tests.fails($$insert into cabins (name) values ('Snarvei')$$, 'hytter kan ikke settes inn direkte');

-- Per oppretter Fjellbu
select tests.login('00000000-0000-0000-0000-00000000000c');
select public.create_cabin('Fjellbu', 'bbbbbbbb-0000-0000-0000-000000000002');
select tests.ok(tests.rows('select 1 from cabins') = 1, 'Per ser bare sin egen hytte');

-- Kari blir med i Furulia via lenke
select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.rows('select 1 from cabins') = 0, 'før invitasjon ser Kari ingen hytter');
select tests.ok(
  (select row(cabin_name, invited_by, member_count, already_member)::text
   from public.invite_preview(tests.token('aaaaaaaa-0000-0000-0000-000000000001')))
  = '(Furulia,Ola,1,f)',
  'invite_preview viser hyttenavn, hvem som inviterte og antall');
select tests.ok(tests.rows($$select * from public.invite_preview('feil-kode')$$) = 0, 'feil kode gir ingen forhåndsvisning');
select tests.fails($$select public.join_cabin('feil-kode')$$, 'feil kode gir ikke medlemskap');
select tests.ok(public.join_cabin(tests.token('aaaaaaaa-0000-0000-0000-000000000001')) = 'aaaaaaaa-0000-0000-0000-000000000001',
  'join_cabin med riktig kode');
select tests.ok(public.join_cabin(tests.token('aaaaaaaa-0000-0000-0000-000000000001')) = 'aaaaaaaa-0000-0000-0000-000000000001',
  'å bli med to ganger går fint');
select tests.ok(tests.rows($$select 1 from cabin_members where user_id = auth.uid() and role = 'member'$$) = 1,
  'Kari er medlem, ikke admin');
select tests.ok(tests.rows('select 1 from cabins') = 1, 'Kari ser Furulia');
select tests.ok(tests.rows('select 1 from profiles') = 2, 'Kari ser seg selv og Ola');
select tests.ok(tests.rows('select 1 from cabin_invites') = 0, 'medlemmer ser ikke invitasjonslenken');
select tests.fails($$select public.new_invite_link('aaaaaaaa-0000-0000-0000-000000000001')$$, 'medlemmer kan ikke lage ny lenke');
select tests.ok(tests.affected($$update cabin_members set role = 'admin' where user_id = auth.uid()$$) = 0,
  'medlemmer kan ikke gjøre seg selv til admin');
select tests.ok(tests.affected($$delete from cabin_members where user_id = '00000000-0000-0000-0000-00000000000a'$$) = 0,
  'medlemmer kan ikke fjerne andre');
select tests.ok(tests.affected($$update cabins set name = 'Kari sin' $$) = 0, 'medlemmer kan ikke endre hytta');
select tests.ok(tests.affected($$delete from cabins$$) = 0, 'medlemmer kan ikke slette hytta');

-- ---------------------------------------------------------------------------
-- Gjøremål, feil, handleliste
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000a');
insert into tasks (id, cabin_id, title) values ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Måke taket');
insert into issues (id, cabin_id, title) values ('22222222-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Lekker kran');
insert into shopping_items (id, cabin_id, name) values
  ('33333333-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Melk'),
  ('33333333-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'Kaffe');

select tests.login('00000000-0000-0000-0000-00000000000b');
insert into tasks (id, cabin_id, title) values
  ('11111111-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'Kjøpe ved'),
  ('11111111-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000001', 'Rydde bod');
select tests.fails($$insert into tasks (cabin_id, title, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Falsk', '00000000-0000-0000-0000-00000000000a')$$,
  'man kan ikke legge inn noe i andres navn');
select tests.ok(tests.affected($$update tasks set done = true where id = '11111111-0000-0000-0000-00000000000a'$$) = 1,
  'medlemmer kan krysse av andres gjøremål');
select tests.ok((select done_by from tasks where id = '11111111-0000-0000-0000-00000000000a') = auth.uid(),
  'avkryssing lagrer hvem som gjorde det');
select tests.ok(tests.affected($$update tasks set created_by = auth.uid() where id = '11111111-0000-0000-0000-00000000000a'$$) = 1
  and (select created_by from tasks where id = '11111111-0000-0000-0000-00000000000a') = '00000000-0000-0000-0000-00000000000a',
  'created_by kan ikke endres');
select tests.ok(tests.affected($$delete from tasks where id = '11111111-0000-0000-0000-00000000000a'$$) = 0,
  'medlemmer kan ikke slette andres gjøremål');
select tests.ok(tests.affected($$delete from tasks where id = '11111111-0000-0000-0000-00000000000b'$$) = 1,
  'medlemmer kan slette egne gjøremål');
select tests.ok(tests.affected($$update issues set status = 'pagar' where id = '22222222-0000-0000-0000-00000000000a'$$) = 1,
  'alle medlemmer kan endre status på feil');
select tests.ok(tests.affected($$delete from issues where id = '22222222-0000-0000-0000-00000000000a'$$) = 0,
  'medlemmer kan ikke slette andres feil');
select tests.ok(tests.affected($$update shopping_items set done = true where name = 'Melk'$$) = 1, 'kryss av vare');
select tests.ok((select bought_by from shopping_items where name = 'Melk') = auth.uid(), 'vare får «Kjøpt av»');
select tests.ok(tests.affected($$delete from shopping_items where name = 'Kaffe'$$) = 0,
  'medlemmer kan ikke slette andres ukjøpte vare');
select tests.ok(tests.affected($$delete from shopping_items where done$$) = 1,
  '«Fjern kjøpte varer» fjerner andres kjøpte varer');

select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(tests.affected($$delete from tasks where id = '11111111-0000-0000-0000-00000000000c'$$) = 1,
  'admin kan slette andres gjøremål');

-- ---------------------------------------------------------------------------
-- Info, sjekklister
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.affected($$update cabin_info set keybox_code = '4711', keybox_location = 'Under trappa'$$) = 1,
  'medlemmer kan redigere info og koder');
select tests.ok((select updated_by from cabin_info) = auth.uid(), 'info husker hvem som endret sist');
insert into checklist_items (id, cabin_id, kind, text, position) values
  ('44444444-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'ankomst', 'Tenn i peisen', 2);
select tests.ok(tests.rows($$select 1 from checklist_items where created_by = auth.uid()$$) = 1, 'medlemmer legger til sjekkpunkter');

select tests.login('00000000-0000-0000-0000-00000000000a');
insert into checklist_items (id, cabin_id, kind, text, position) values
  ('44444444-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'ankomst', 'Skru på vannet', 1);
select tests.ok(tests.rows('select 1 from checklist_items') = 2, 'admin legger til sjekkpunkter');

select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.affected($$update checklist_items set position = 3 - position$$) = 2, 'medlemmer endrer rekkefølgen på alle punkter');
select tests.ok(tests.affected($$delete from checklist_items where created_by <> auth.uid()$$) = 0, 'medlemmer kan ikke fjerne andres sjekkpunkter');
select tests.ok(tests.affected($$delete from checklist_items where created_by = auth.uid()$$) = 1, 'medlemmer fjerner egne sjekkpunkter');
insert into checklist_runs (cabin_id, kind) values ('aaaaaaaa-0000-0000-0000-000000000001', 'ankomst');
select tests.ok(tests.rows($$select 1 from checklist_runs where completed_by = auth.uid()$$) = 1, 'medlemmer logger gjennomgang');
select tests.ok(tests.affected($$delete from checklist_runs$$) = 0, 'medlemmer kan ikke slette gjennomganger');

-- ---------------------------------------------------------------------------
-- Kalender: opphold, hendelser og farge
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');  -- Kari
insert into stays (id, cabin_id, user_id, start_date, end_date) values
  ('55555555-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), '2026-10-10', '2026-10-14');
insert into stays (cabin_id, guest_name, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mormor', '2026-10-10', '2026-10-12');
select tests.ok(tests.rows($$select 1 from stays where guest_name = 'Mormor'$$) = 1, 'opphold kan gjelde noen som ikke bruker appen');
select tests.fails($$insert into stays (cabin_id, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-10', '2026-10-12')$$, 'opphold må gjelde noen');
select tests.fails($$insert into stays (cabin_id, user_id, guest_name, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), 'Mormor', '2026-10-10', '2026-10-12')$$, 'opphold gjelder enten et medlem eller et navn');
delete from stays where guest_name = 'Mormor';
insert into stays (id, cabin_id, user_id, start_date, end_date) values
  ('55555555-0000-0000-0000-00000000000c', 'aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2026-10-12', '2026-10-13');
select tests.ok(tests.rows('select 1 from stays') = 2, 'medlemmer kan legge inn opphold for andre i hytta, også samtidig');
select tests.fails($$insert into stays (cabin_id, user_id, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', '2026-10-12', '2026-10-13')$$,
  'opphold kan ikke gjelde noen utenfor hytta');
select tests.fails($$insert into stays (cabin_id, user_id, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), '2026-10-12', '2026-10-11')$$, 'opphold kan ikke slutte før det starter');
insert into calendar_events (id, cabin_id, title, start_date, end_date) values
  ('66666666-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dugnad', '2026-10-17', '2026-10-17');
select tests.ok(tests.affected($$update profiles set color = '#2d5a47' where id = auth.uid()$$) = 1, 'egen farge kan endres');
select tests.ok(tests.affected($$update profiles set color = '#000000' where id <> auth.uid()$$) = 0, 'andres farge kan ikke endres');
select tests.fails($$update profiles set color = 'rød' where id = auth.uid()$$, 'farge må være en hex-kode');

select tests.login('00000000-0000-0000-0000-00000000000a');  -- Ola, admin
insert into calendar_events (id, cabin_id, title, start_date, end_date) values
  ('66666666-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', 'Vinterferie', '2027-02-22', '2027-02-26');
select tests.ok(tests.affected($$update stays set end_date = '2026-10-15' where id = '55555555-0000-0000-0000-00000000000b'$$) = 1,
  'medlemmer kan endre andres opphold');
select tests.ok(tests.affected($$delete from stays where id = '55555555-0000-0000-0000-00000000000c'$$) = 1,
  'den oppholdet gjelder kan slette det');

select tests.login('00000000-0000-0000-0000-00000000000b');  -- Kari
select tests.ok(tests.affected($$update calendar_events set title = 'Vinterferie (uke 8)' where id = '66666666-0000-0000-0000-00000000000a'$$) = 1,
  'medlemmer kan endre andres hendelser');
select tests.ok(tests.affected($$delete from calendar_events where id = '66666666-0000-0000-0000-00000000000a'$$) = 0,
  'medlemmer kan ikke slette andres hendelser');
select tests.ok(tests.affected($$delete from calendar_events where id = '66666666-0000-0000-0000-00000000000b'$$) = 1,
  'medlemmer kan slette egne hendelser');

select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(tests.affected($$delete from calendar_events$$) = 1, 'admin kan slette andres hendelser');

-- ---------------------------------------------------------------------------
-- Historikk
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000b');  -- Kari
insert into history_entries (id, cabin_id, happened_on, title) values
  ('77777777-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', '2019-06-15', 'Malte hytta');
select tests.ok(tests.rows($$select 1 from history_entries where created_by = auth.uid()$$) = 1, 'medlemmer skriver i historikken, også tilbake i tid');
select tests.login('00000000-0000-0000-0000-00000000000a');  -- Ola, admin
insert into history_entries (id, cabin_id, happened_on, title) values
  ('77777777-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '2024-08-01', 'Ny kledning på nordveggen');
select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.affected($$update history_entries set title = 'Ny kledning, nord og vest' where id = '77777777-0000-0000-0000-00000000000a'$$) = 1,
  'medlemmer kan endre andres oppføringer');
select tests.ok(tests.affected($$delete from history_entries where id = '77777777-0000-0000-0000-00000000000a'$$) = 0,
  'medlemmer kan ikke slette andres oppføringer');
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(tests.affected($$delete from history_entries where id = '77777777-0000-0000-0000-00000000000b'$$) = 1,
  'admin kan slette andres oppføringer');

-- ---------------------------------------------------------------------------
-- Andre hytter og utenforstående
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000c');  -- Per, admin i Fjellbu
select tests.ok(tests.rows($$select 1 from cabins where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 0, 'Per ser ikke Furulia');
select tests.ok(tests.rows('select 1 from tasks') = 0, 'Per ser ikke Furulias gjøremål');
select tests.ok(tests.rows('select 1 from issues') = 0, 'Per ser ikke Furulias feil');
select tests.ok(tests.rows('select 1 from shopping_items') = 0, 'Per ser ikke Furulias handleliste');
select tests.ok(tests.rows($$select 1 from cabin_info where cabin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 0,
  'Per ser ikke Furulias koder');
select tests.ok(tests.rows('select 1 from checklist_items') = 0, 'Per ser ikke Furulias sjekkliste');
select tests.ok(tests.rows('select 1 from stays') = 0, 'Per ser ikke Furulias opphold');
select tests.ok(tests.rows('select 1 from history_entries') = 0, 'Per ser ikke Furulias historikk');
select tests.fails($$insert into calendar_events (cabin_id, title, start_date, end_date) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Inntrenger', '2026-10-10', '2026-10-10')$$, 'Per kan ikke legge til hendelser i Furulia');
select tests.ok(tests.affected($$delete from stays$$) = 0, 'Per kan ikke slette Furulias opphold');
select tests.ok(tests.rows($$select 1 from cabin_members where cabin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 0,
  'Per ser ikke Furulias medlemmer');
select tests.ok(tests.rows($$select 1 from profiles where id <> auth.uid()$$) = 0, 'Per ser ikke andres profiler');
select tests.fails($$insert into tasks (cabin_id, title) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Inntrenger')$$,
  'Per kan ikke legge inn gjøremål i Furulia');
select tests.ok(tests.affected($$update issues set status = 'fikset'$$) = 0, 'Per kan ikke endre Furulias feil');
select tests.ok(tests.affected($$update cabin_info set keybox_code = '0000' where cabin_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$) = 0,
  'Per kan ikke endre Furulias koder');
select tests.ok(tests.affected($$delete from shopping_items$$) = 0, 'Per kan ikke slette Furulias varer');
select tests.fails($$select public.new_invite_link('aaaaaaaa-0000-0000-0000-000000000001')$$, 'Per kan ikke lage lenke til Furulia');
select tests.ok(tests.affected($$update tasks set cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$) = 0,
  'Per kan ikke flytte Furulias gjøremål');

select tests.login('00000000-0000-0000-0000-00000000000d');  -- Eve, ikke med noe sted
select tests.ok(tests.rows('select 1 from cabins') = 0, 'Eve ser ingen hytter');
select tests.ok(tests.rows('select 1 from profiles') = 1, 'Eve ser bare sin egen profil');
select tests.fails($$insert into cabin_members (cabin_id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid())$$, 'Eve kan ikke melde seg inn uten lenke');
select tests.fails($$select public.create_cabin('Ugyldig', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  'create_cabin kan ikke overta en eksisterende hytte');

-- ---------------------------------------------------------------------------
-- Ny lenke, fjerne medlemmer
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.fails($$delete from cabin_members where user_id = auth.uid()$$, 'siste admin kan ikke fjerne seg selv');
select tests.fails($$update cabin_members set role = 'member' where user_id = auth.uid()$$, 'siste admin kan ikke miste admin-rollen');
reset role;
create table tests.saved as select tests.token('aaaaaaaa-0000-0000-0000-000000000001') as token;
grant select on tests.saved to authenticated;
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(public.new_invite_link('aaaaaaaa-0000-0000-0000-000000000001') <> (select token from tests.saved),
  'admin lager ny lenke');

select tests.login('00000000-0000-0000-0000-00000000000d');
select tests.fails($$select public.join_cabin((select token from tests.saved))$$, 'gammel lenke virker ikke lenger');
select tests.ok(public.join_cabin(tests.token('aaaaaaaa-0000-0000-0000-000000000001')) is not null, 'ny lenke virker');
select tests.ok(tests.rows('select 1 from profiles') = 3, 'nytt medlem ser de andre i hytta');

select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(tests.affected($$delete from cabin_members where user_id = '00000000-0000-0000-0000-00000000000b'$$) = 1,
  'admin fjerner Kari');

select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.rows('select 1 from cabins') = 0, 'Kari mister tilgangen med en gang');
select tests.ok(tests.rows('select 1 from tasks') = 0, 'Kari ser ikke lenger gjøremålene');
select tests.ok(tests.count_as_owner($$select 1 from public.checklist_runs where completed_by = '00000000-0000-0000-0000-00000000000b'$$) = 1,
  'det Kari la inn blir liggende');

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
select tests.login('00000000-0000-0000-0000-00000000000a');
insert into storage.objects (bucket_id, name) values ('cabin-files', 'aaaaaaaa-0000-0000-0000-000000000001/issues/ola.jpg');
select tests.ok(tests.rows('select 1 from storage.objects') = 1, 'medlem laster opp fil i hyttas mappe');

select tests.login('00000000-0000-0000-0000-00000000000d');  -- Eve, nå medlem
select tests.ok(tests.rows('select 1 from storage.objects') = 1, 'andre medlemmer ser filen');
select tests.ok(tests.affected($$delete from storage.objects where name like '%ola.jpg'$$) = 0, 'medlem kan ikke slette andres fil');
insert into storage.objects (bucket_id, name) values ('cabin-files', 'aaaaaaaa-0000-0000-0000-000000000001/documents/eve.pdf');
select tests.ok(tests.affected($$delete from storage.objects where name like '%eve.pdf'$$) = 1, 'medlem sletter egen fil');

select tests.login('00000000-0000-0000-0000-00000000000c');  -- Per
select tests.ok(tests.rows('select 1 from storage.objects') = 0, 'Per ser ikke Furulias filer');
select tests.fails($$insert into storage.objects (bucket_id, name) values
  ('cabin-files', 'aaaaaaaa-0000-0000-0000-000000000001/issues/per.jpg')$$, 'Per kan ikke laste opp til Furulia');
select tests.fails($$insert into storage.objects (bucket_id, name) values ('cabin-files', 'ikke-en-uuid/x.jpg')$$,
  'filer må ligge i en hyttemappe');

select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.ok(tests.affected($$delete from storage.objects$$) = 1, 'admin kan slette alle filer i hytta');

-- ---------------------------------------------------------------------------
-- Ikke innlogget
-- ---------------------------------------------------------------------------
reset role;
select tests.ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.keep_one_admin()', 'execute'),
  'triggerfunksjoner kan ikke kalles som RPC');

select set_config('request.jwt.claims', '', false);
set role anon;
select tests.fails('select * from public.cabins', 'anon kan ikke lese hytter');
select tests.fails('select * from public.cabin_invites', 'anon kan ikke lese invitasjoner');
select tests.fails($$select public.join_cabin('x')$$, 'anon kan ikke bli med');
select tests.fails($$select * from public.invite_preview('x')$$, 'anon kan ikke forhåndsvise invitasjoner');

-- ---------------------------------------------------------------------------
-- Slette hytte
-- ---------------------------------------------------------------------------
set role authenticated;

-- Eve blir med i Fjellbu og legger inn litt av alt.
select tests.login('00000000-0000-0000-0000-00000000000d');
select public.join_cabin(tests.token('bbbbbbbb-0000-0000-0000-000000000002'));
insert into tasks (cabin_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Måke tak');
insert into issues (cabin_id, title) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Lekker');
insert into shopping_items (cabin_id, name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Ved');
insert into stays (cabin_id, user_id, start_date, end_date)
  values ('bbbbbbbb-0000-0000-0000-000000000002', auth.uid(), '2026-10-10', '2026-10-12');
insert into calendar_events (cabin_id, title, start_date, end_date)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 'Dugnad', '2026-10-20', '2026-10-20');
insert into history_entries (cabin_id, happened_on, title)
  values ('bbbbbbbb-0000-0000-0000-000000000002', '2026-10-01', 'Nytt tak');
insert into storage.objects (bucket_id, name, owner_id)
  values ('cabin-files', 'bbbbbbbb-0000-0000-0000-000000000002/history/eve.jpg', auth.uid()::text);

select tests.ok(tests.affected($$delete from cabins where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$) = 0,
  'medlem kan ikke slette hytta');
select tests.login('00000000-0000-0000-0000-00000000000a');  -- Ola, admin i en annen hytte
select tests.ok(tests.affected($$delete from cabins where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$) = 0,
  'admin i en annen hytte kan ikke slette hytta');

-- Per sletter som appen gjør: først filene, så hytta.
select tests.login('00000000-0000-0000-0000-00000000000c');
select tests.ok(tests.affected($$delete from storage.objects where name like 'bbbbbbbb-0000-0000-0000-000000000002/%'$$) = 1,
  'admin sletter hyttas filer, også andres');
select tests.ok(tests.affected($$delete from cabins where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$) = 1,
  'admin kan slette hytta si');

reset role;
select tests.ok(
  (select count(*) from public.cabin_members where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.cabin_invites where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.cabin_info where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.tasks where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.issues where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.shopping_items where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.stays where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.calendar_events where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from public.history_entries where cabin_id = 'bbbbbbbb-0000-0000-0000-000000000002')
  + (select count(*) from storage.objects where name like 'bbbbbbbb-0000-0000-0000-000000000002/%') = 0,
  'alt som hørte til hytta er borte');
select tests.ok(tests.rows($$select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000d'$$) = 1,
  'medlemmene har fortsatt kontoen sin');
-- ---------------------------------------------------------------------------
-- Push-varsler
-- ---------------------------------------------------------------------------
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000b');  -- Kari
select public.save_push_subscription('https://push.example/kari-telefon', 'p', 'a');
select tests.ok(tests.rows($$select 1 from push_subscriptions$$) = 1, 'ser eget push-abonnement');
select tests.fails($$insert into push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/x', 'p', 'a')$$,
  'abonnement lagres bare via save_push_subscription');
insert into notification_prefs (stays) values (true);
select tests.fails($$insert into notification_prefs (user_id) values ('00000000-0000-0000-0000-00000000000a')$$,
  'kan ikke lagre varselvalg for andre');
select tests.ok(public.push_public_key() is null, 'ingen VAPID-nøkkel før den er satt opp');
select tests.fails($$select public.push_settings()$$, 'appen får ikke lese de hemmelige nøklene');
select tests.fails($$select public.request_push('{}')$$, 'appen kan ikke be om utsending selv');

select tests.login('00000000-0000-0000-0000-00000000000a');  -- Ola
select tests.ok(tests.rows($$select 1 from push_subscriptions$$) = 0, 'ser ikke andres push-abonnement');
select tests.ok(tests.rows($$select 1 from notification_prefs$$) = 0, 'ser ikke andres varselvalg');
select tests.ok(tests.affected($$delete from push_subscriptions$$) = 0, 'kan ikke slette andres abonnement');
-- Ola logger inn på samme telefon etter Kari.
select public.save_push_subscription('https://push.example/kari-telefon', 'p2', 'a2');
select tests.ok(tests.rows($$select 1 from push_subscriptions$$) = 1, 'ny bruker på samme telefon tar over abonnementet');
select tests.login('00000000-0000-0000-0000-00000000000b');
select tests.ok(tests.rows($$select 1 from push_subscriptions$$) = 0, 'forrige bruker får ikke lenger varsler på telefonen');
select tests.ok(tests.affected($$update notification_prefs set user_id = '00000000-0000-0000-0000-00000000000a', tasks = true$$) = 1
  and tests.rows($$select 1 from notification_prefs where tasks$$) = 1, 'varselvalg kan ikke flyttes til en annen');
reset role;

\echo 'Alle RLS-tester bestått.'
