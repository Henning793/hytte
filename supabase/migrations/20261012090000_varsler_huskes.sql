-- Varsler huskes etter utlogging.
-- «Varsler på» lagres nå på personen, ikke bare på enheten. Logger man ut og inn
-- igjen (eller tømmer bufferen), slår appen varslene på igjen av seg selv når
-- telefonen fortsatt har gitt lov. Valgene av hvilke varsler lå allerede her.
alter table public.notification_prefs
  add column if not exists push_enabled boolean not null default false;

-- De som har varsler på en enhet i dag, har dem på.
insert into public.notification_prefs (user_id, push_enabled)
select distinct user_id, true from public.push_subscriptions
on conflict (user_id) do update set push_enabled = true;
