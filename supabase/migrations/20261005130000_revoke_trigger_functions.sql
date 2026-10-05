-- Triggerfunksjoner skal ikke kunne kalles som RPC. Supabase gir authenticated
-- execute på nye funksjoner som standard, så det må fjernes eksplisitt.
-- (Funnet av Supabases sikkerhetsråd da migrasjonene ble kjørt første gang.)
revoke execute on function public.handle_new_user(), public.keep_one_admin() from authenticated;
