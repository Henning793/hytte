-- Ferge: hvilke brygger hytta bruker, slik at appen kan vise avganger fra Entur.
-- {"home": {"id": "NSR:StopPlace:1853", "name": "Nedgården"},
--  "cabin": {"id": "NSR:StopPlace:1869", "name": "Gravningsund"}}
-- Tom (null) betyr at hytta ikke bruker ferge. Alle medlemmer kan endre den, som resten av info.
alter table public.cabin_info add column if not exists ferry jsonb;
