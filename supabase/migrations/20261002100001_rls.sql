-- ============================================================
-- Row Level Security
--
-- The rule: clients READ their own rows, and every write goes through a
-- server route holding the service role key.
--
-- The one that matters most: sub_credentials has NO policy for ordinary
-- users — not even for a credential they are paying for. A password leaves
-- the database only through /api/subscriptions/reveal, which checks
-- ownership and expiry first and writes an audit row.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

alter table public.profiles        enable row level security;
alter table public.admin_logs      enable row level security;
alter table public.sub_products    enable row level security;
alter table public.sub_plans       enable row level security;
alter table public.sub_teams       enable row level security;
alter table public.sub_credentials enable row level security;
alter table public.sub_orders      enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.sub_events      enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- A user may edit their own name and phone, but the WITH CHECK pins `role`
-- to whatever it already is — so nobody can make themselves an admin.
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and is_banned = (select is_banned from public.profiles where id = auth.uid())
  );

-- ---------- admin_logs ----------
drop policy if exists "admin_logs admin read" on public.admin_logs;
create policy "admin_logs admin read" on public.admin_logs
  for select using (public.is_admin());

-- ---------- catalogue: public ----------
drop policy if exists "sub_products read" on public.sub_products;
create policy "sub_products read" on public.sub_products
  for select using (is_active or public.is_admin());

drop policy if exists "sub_plans read" on public.sub_plans;
create policy "sub_plans read" on public.sub_plans
  for select using (is_active or public.is_admin());

-- ---------- orders: own rows ----------
drop policy if exists "sub_orders self read" on public.sub_orders;
create policy "sub_orders self read" on public.sub_orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "sub_orders self insert" on public.sub_orders;
create policy "sub_orders self insert" on public.sub_orders
  for insert with check (user_id = auth.uid() and status = 'pending');

-- ---------- subscriptions: own rows ----------
-- credential_id is an opaque pointer; the row itself carries no secret.
drop policy if exists "subscriptions self read" on public.subscriptions;
create policy "subscriptions self read" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- ---------- teams: admin only ----------
-- Customers learn their team NAME from the reveal route, not from here.
drop policy if exists "sub_teams admin read" on public.sub_teams;
create policy "sub_teams admin read" on public.sub_teams
  for select using (public.is_admin());

-- ---------- credentials: admin only ----------
-- Do not add a user-facing policy to this table. Ever.
drop policy if exists "sub_credentials admin read" on public.sub_credentials;
create policy "sub_credentials admin read" on public.sub_credentials
  for select using (public.is_admin());

-- ---------- events: admin only ----------
drop policy if exists "sub_events admin read" on public.sub_events;
create policy "sub_events admin read" on public.sub_events
  for select using (public.is_admin());

-- ============================================================
-- Table grants
--
-- Supabase grants everything on new public tables to anon and authenticated
-- and leans on RLS. Tighten that: anon reaches only the catalogue, and no
-- browser role writes anywhere except inserting its own pending order.
--
-- `authenticated` deliberately keeps SELECT on sub_credentials, sub_teams
-- and sub_events: the admin pages are Server Components using the ordinary
-- client, and the admin-only policies above are what gate those reads.
-- Decryption still happens only in service-role routes.
-- ============================================================

revoke all on public.sub_credentials from anon;
revoke all on public.sub_teams       from anon;
revoke all on public.sub_events      from anon;
revoke all on public.subscriptions   from anon;
revoke all on public.sub_orders      from anon;
revoke all on public.admin_logs      from anon;
revoke all on public.profiles        from anon;

revoke insert, update, delete on public.sub_products    from anon, authenticated;
revoke insert, update, delete on public.sub_plans       from anon, authenticated;
revoke insert, update, delete on public.sub_teams       from anon, authenticated;
revoke insert, update, delete on public.sub_credentials from anon, authenticated;
revoke insert, update, delete on public.subscriptions   from anon, authenticated;
revoke insert, update, delete on public.sub_events      from anon, authenticated;
revoke insert, update, delete on public.admin_logs      from anon, authenticated;
revoke        update, delete on public.sub_orders       from anon, authenticated;

grant select on public.sub_products, public.sub_plans to anon, authenticated;
grant select on public.sub_team_usage, public.sub_credential_usage to authenticated;
grant select on public.subscriptions, public.admin_logs to authenticated;
grant select, insert on public.sub_orders to authenticated;
grant select, update on public.profiles to authenticated;

commit;
