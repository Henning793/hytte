-- Påminnelsene (hendelser og egne opphold i morgen) sendes kl. 12 norsk tid hele året.
--
-- pg_cron går i UTC, og kl. 12 i Norge er 10 UTC om sommeren og 11 UTC om
-- vinteren. Jobben kjører derfor begge gangene, og Edge Function «push» sender
-- bare når klokka er 12 i Norge. Rull ut den nye funksjonen før denne kjøres.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Samme navn erstatter den gamle jobben (16 UTC).
    perform cron.schedule('push-paminnelser', '0 10,11 * * *', $c$select public.request_push('{"kind": "reminders"}')$c$);
  end if;
end;
$$;
