-- ============================================================
-- A credential row for an invite product needs no password
--
-- For a credential product the row holds the login we hand over, so a
-- password is the whole point. For an invite product the row only tracks
-- WHICH panel or class a customer was placed into, so it can count seats
-- and route the next customer. The seller logs into that panel themselves
-- and sends the invite by hand — there is nothing to store and nothing to
-- decrypt, and storing it anyway would be a secret kept for no reason.
--
-- The CHECK on password_enc stays as it is: in Postgres a CHECK that
-- evaluates to NULL passes, so a NULL password is allowed while any
-- non-null value must still be properly encrypted.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

alter table public.sub_credentials
  alter column password_enc drop not null;

notify pgrst, 'reload schema';

commit;
