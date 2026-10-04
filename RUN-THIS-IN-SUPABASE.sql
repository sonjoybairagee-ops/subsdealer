-- ============================================================
-- Subdealer - complete database setup
--
-- Run this ONCE against a brand new Supabase project.
-- Paste the whole file into the SQL Editor and press Run.
--
-- It creates: accounts, the subscription catalogue, the credential
-- vault, orders, the audit trail, every function, all Row Level
-- Security, the private receipts bucket, and a starting catalogue
-- of Canva Pro, CapCut Pro and ChatGPT Plus.
--
-- Wrapped in a single transaction: if anything fails, nothing is
-- applied. Safe to run more than once.
-- ============================================================

begin;

-- ============================================================
-- FILE 1 of 5: 20261002100000_init.sql
-- ============================================================
-- ============================================================
-- Subdealer — complete schema
--
-- Run this against a FRESH Supabase project. It creates everything:
-- accounts, the subscription catalogue, the credential vault, orders,
-- the audit trail, every function and all Row Level Security.
--
-- Two ways a product reaches a customer:
--   delivery_type = 'credential'  we hand over an email + password
--   delivery_type = 'invite'      we invite the customer's own account
--
-- Passwords are encrypted by the application (AES-256-GCM) before they
-- ever reach Postgres. The database never sees a plaintext password.
--
-- Idempotent: safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Accounts
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  phone      text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  is_banned  boolean not null default false,
  ban_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email)) where email is not null;

-- Create the profile row automatically when someone signs up, so no code
-- path can ever leave an auth user without one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Used by every RLS policy below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_banned = false
  );
$$;

-- Append-only record of admin actions.
create table if not exists public.admin_logs (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target_id  text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_logs_recent_idx on public.admin_logs(created_at desc);

-- ============================================================
-- Catalogue
-- ============================================================

create table if not exists public.sub_products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  tagline       text,
  description   text,
  thumbnail_url text,
  category      text,
  access_type   text not null default 'shared'
                  check (access_type in ('personal', 'shared')),
  delivery_type text not null default 'credential'
                  check (delivery_type in ('credential', 'invite')),
  login_url     text,
  features      jsonb not null default '[]'::jsonb,
  terms_note    text,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.sub_plans (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.sub_products(id) on delete cascade,
  name           text not null,
  duration_days  int not null check (duration_days between 1 and 3650),
  price_bdt      numeric(10,2) not null check (price_bdt >= 0),
  compare_at_bdt numeric(10,2),
  is_active      boolean not null default true,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists sub_plans_product_idx
  on public.sub_plans(product_id) where is_active;

-- ============================================================
-- Supply
-- ============================================================

create table if not exists public.sub_teams (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.sub_products(id) on delete cascade,
  name       text not null,
  capacity   int not null default 5 check (capacity between 1 and 500),
  login_url  text,
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists sub_teams_product_name_idx
  on public.sub_teams(product_id, lower(name));

-- password_enc format: base64(iv) ':' base64(authTag) ':' base64(ciphertext)
create table if not exists public.sub_credentials (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.sub_products(id) on delete cascade,
  team_id      uuid references public.sub_teams(id) on delete set null,
  label        text,
  login_email  text not null,
  password_enc text not null,
  login_url    text,
  extra_notes  text,
  max_users    int not null default 1 check (max_users between 1 and 500),
  status       text not null default 'active'
                 check (status in ('active', 'rotating', 'revoked')),
  rotated_at   timestamptz,
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists sub_credentials_product_idx
  on public.sub_credentials(product_id) where status = 'active';
create index if not exists sub_credentials_team_idx on public.sub_credentials(team_id);

-- A plaintext password must never land in this column by accident. The app
-- always writes three base64 segments, so anything else is rejected outright.
alter table public.sub_credentials
  drop constraint if exists sub_credentials_password_enc_shape;
alter table public.sub_credentials
  add constraint sub_credentials_password_enc_shape
  check (password_enc ~ '^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$');

-- ============================================================
-- Sales
-- ============================================================

create table if not exists public.sub_orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  product_id    uuid not null references public.sub_products(id),
  plan_id       uuid not null references public.sub_plans(id),
  amount_bdt    numeric(10,2) not null check (amount_bdt >= 0),
  method        text not null default 'bkash'
                  check (method in ('bkash', 'nagad', 'manual')),
  sender_number text,
  txn_ref       text,
  receipt_path  text,
  invite_email  text,
  status        text not null default 'pending'
                  check (status in ('pending', 'on_hold', 'approved', 'rejected')),
  hold_reason   text,
  reject_reason text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists sub_orders_user_idx on public.sub_orders(user_id);
create index if not exists sub_orders_pending_idx
  on public.sub_orders(created_at) where status in ('pending', 'on_hold');

-- One transaction ID backs one live order.
create unique index if not exists sub_orders_txn_unique
  on public.sub_orders (method, lower(txn_ref))
  where txn_ref is not null and status in ('pending', 'on_hold', 'approved');

create table if not exists public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  product_id     uuid not null references public.sub_products(id),
  plan_id        uuid not null references public.sub_plans(id),
  order_id       uuid references public.sub_orders(id),
  credential_id  uuid references public.sub_credentials(id) on delete set null,
  team_id        uuid references public.sub_teams(id) on delete set null,
  invite_email   text,
  invited_at     timestamptz,
  start_date     timestamptz not null default now(),
  expiry_date    timestamptz not null,
  status         text not null default 'pending_credential'
                   check (status in ('pending_credential', 'active', 'expired', 'revoked', 'paused')),
  revoked_reason text,
  admin_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Approving one order twice must not create a second subscription.
create unique index if not exists subscriptions_one_per_order
  on public.subscriptions(order_id) where order_id is not null;
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_credential_idx
  on public.subscriptions(credential_id) where status = 'active';
create index if not exists subscriptions_expiry_idx
  on public.subscriptions(expiry_date) where status = 'active';
create index if not exists subscriptions_invite_pending_idx
  on public.subscriptions(created_at) where invited_at is null and status = 'active';

-- ============================================================
-- Audit
-- ============================================================

create table if not exists public.sub_events (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  credential_id   uuid references public.sub_credentials(id) on delete set null,
  actor_id        uuid references public.profiles(id) on delete set null,
  event           text not null,
  -- SUBSCRIPTION_CREATED | CREDENTIAL_ASSIGNED | CREDENTIAL_UNASSIGNED
  -- CREDENTIAL_ROTATED   | CREDENTIAL_VIEWED   | TEAM_TRANSFERRED
  -- INVITE_SENT | INVITE_EMAIL_CHANGED | EXTENDED | PAUSED | RESUMED
  -- REVOKED | EXPIRED | REMINDER_SENT
  -- Free text on purpose: a new event type should never need a migration.
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists sub_events_sub_idx
  on public.sub_events(subscription_id, created_at desc);
create index if not exists sub_events_actor_recent_idx
  on public.sub_events(actor_id, created_at desc);
create index if not exists sub_events_credential_idx
  on public.sub_events(credential_id, created_at desc);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function public.sub_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sub_products_touch on public.sub_products;
create trigger sub_products_touch before update on public.sub_products
  for each row execute function public.sub_touch_updated_at();

drop trigger if exists sub_credentials_touch on public.sub_credentials;
create trigger sub_credentials_touch before update on public.sub_credentials
  for each row execute function public.sub_touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.sub_touch_updated_at();

-- ============================================================
-- Views
--
-- security_invoker = true is ESSENTIAL. A view defaults to the owner's
-- rights, which silently bypasses the RLS on the tables underneath — that
-- would hand sub_credential_usage (login emails) to anyone who asked.
-- ============================================================

create or replace view public.sub_team_usage
with (security_invoker = true) as
select
  t.id as team_id,
  t.product_id,
  t.name,
  t.capacity,
  t.is_active,
  count(s.id) filter (where s.status = 'active') as active_members,
  t.capacity - count(s.id) filter (where s.status = 'active') as free_slots
from public.sub_teams t
left join public.subscriptions s on s.team_id = t.id
group by t.id;

create or replace view public.sub_credential_usage
with (security_invoker = true) as
select
  c.id as credential_id,
  c.product_id,
  c.team_id,
  c.login_email,
  c.label,
  c.status,
  c.max_users,
  c.rotated_at,
  c.updated_at,
  count(s.id) filter (where s.status = 'active') as active_users,
  c.max_users - count(s.id) filter (where s.status = 'active') as free_slots
from public.sub_credentials c
left join public.subscriptions s on s.credential_id = c.id
group by c.id;

-- ============================================================
-- FILE 2 of 5: 20261002100001_rls.sql
-- ============================================================
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

-- ============================================================
-- FILE 3 of 5: 20261002100002_functions.sql
-- ============================================================
-- ============================================================
-- Subdealer — server-side functions
--
-- All of these are service_role only. The website calls them through
-- supabase.rpc() from API routes, never from the browser.
--
-- security invoker + `set search_path = ''` + fully qualified names, so
-- none of them can be hijacked by a search_path trick.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ============================================================
-- Subscription portal — server-side functions
--
-- Everything here is service_role only. The website calls these
-- through supabase.rpc() from API routes, never from the browser.
--
-- Style follows public.approve_order_and_issue_license:
--   security invoker + set search_path = '' + fully qualified names,
--   so the function cannot be hijacked by a search_path trick.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- sub_pick_credential
--
-- Finds a credential for a product that still has a free slot.
-- Prefers the fullest-but-not-full credential so we fill teams
-- up one at a time instead of scattering customers around.
--
-- Returns null when the pool is exhausted — the caller then leaves
-- the subscription in 'pending_credential' and the admin dashboard
-- raises it as work to do.
-- ------------------------------------------------------------
create or replace function public.sub_pick_credential(p_product_id uuid)
returns uuid
language sql
security invoker
stable
set search_path = ''
as $$
  select c.id
  from public.sub_credentials c
  left join public.subscriptions s
    on s.credential_id = c.id and s.status = 'active'
  where c.product_id = p_product_id
    and c.status = 'active'
  group by c.id, c.max_users
  having count(s.id) < c.max_users
  order by count(s.id) desc, c.created_at asc
  limit 1
$$;

-- ------------------------------------------------------------
-- approve_sub_order
--
-- The money moment. Turns an approved bKash payment into a live
-- subscription, in one transaction:
--
--   1. lock the order
--   2. if a subscription already exists for it, return that
--      (double-click / retry safe)
--   3. compute expiry from the plan duration
--   4. try to auto-assign a credential; if the pool is dry the
--      subscription waits in 'pending_credential'
--   5. mark the order approved and write the audit events
--
-- p_credential_id lets the admin override auto-assignment.
-- p_auto_assign = false forces manual assignment.
-- ------------------------------------------------------------
create or replace function public.approve_sub_order(
  p_order_id      uuid,
  p_admin_id      uuid default null,
  p_credential_id uuid default null,
  p_auto_assign   boolean default true
)
returns public.subscriptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order        public.sub_orders;
  v_plan         public.sub_plans;
  v_sub          public.subscriptions;
  v_credential   public.sub_credentials;
  v_cred_id      uuid;
  v_team_id      uuid;
  v_status       text;
  v_now          timestamptz := now();
begin
  select * into v_order
  from public.sub_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;

  select * into v_sub
  from public.subscriptions
  where order_id = v_order.id;
  if found then
    return v_sub;
  end if;

  if v_order.status not in ('pending', 'on_hold', 'approved') then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_APPROVABLE';
  end if;

  select * into v_plan
  from public.sub_plans
  where id = v_order.plan_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'PLAN_NOT_FOUND';
  end if;

  if p_credential_id is not null then
    select * into v_credential
    from public.sub_credentials
    where id = p_credential_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'CREDENTIAL_NOT_FOUND';
    end if;
    if v_credential.product_id <> v_order.product_id then
      raise exception using errcode = 'P0001', message = 'CREDENTIAL_PRODUCT_MISMATCH';
    end if;
    if v_credential.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'CREDENTIAL_NOT_ACTIVE';
    end if;
    if (
      select count(*) from public.subscriptions
      where credential_id = v_credential.id and status = 'active'
    ) >= v_credential.max_users then
      raise exception using errcode = 'P0001', message = 'CREDENTIAL_FULL';
    end if;

    v_cred_id := v_credential.id;
    v_team_id := v_credential.team_id;

  elsif p_auto_assign then
    v_cred_id := public.sub_pick_credential(v_order.product_id);
    if v_cred_id is not null then
      select team_id into v_team_id
      from public.sub_credentials
      where id = v_cred_id;
    end if;
  end if;

  v_status := case when v_cred_id is null then 'pending_credential' else 'active' end;

  insert into public.subscriptions (
    user_id, product_id, plan_id, order_id,
    credential_id, team_id,
    start_date, expiry_date, status, invite_email
  ) values (
    v_order.user_id, v_order.product_id, v_order.plan_id, v_order.id,
    v_cred_id, v_team_id,
    v_now, v_now + make_interval(days => v_plan.duration_days), v_status,
    v_order.invite_email
  )
  returning * into v_sub;

  update public.sub_orders
     set status      = 'approved',
         reviewed_by = coalesce(p_admin_id, reviewed_by),
         reviewed_at = v_now,
         hold_reason = null
   where id = v_order.id;

  insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
  values (
    v_sub.id, v_cred_id, p_admin_id, 'SUBSCRIPTION_CREATED',
    jsonb_build_object(
      'order_id',      v_order.id,
      'plan_id',       v_plan.id,
      'duration_days', v_plan.duration_days,
      'amount_bdt',    v_order.amount_bdt,
      'method',        v_order.method,
      'expiry_date',   v_sub.expiry_date,
      'invite_email',  v_order.invite_email
    )
  );

  if v_cred_id is not null then
    insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
    values (
      v_sub.id, v_cred_id, p_admin_id, 'CREDENTIAL_ASSIGNED',
      jsonb_build_object('auto', p_credential_id is null, 'team_id', v_team_id)
    );
  end if;

  return v_sub;
end $$;

-- ------------------------------------------------------------
-- sub_assign_credential
--
-- Bind (or re-bind) a credential to one subscription. Used for the
-- 'pending_credential' queue and for moving someone off a burnt
-- account onto a spare.
-- ------------------------------------------------------------
create or replace function public.sub_assign_credential(
  p_subscription_id uuid,
  p_credential_id   uuid,
  p_admin_id        uuid default null
)
returns public.subscriptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sub        public.subscriptions;
  v_credential public.sub_credentials;
  v_old_cred   uuid;
  v_in_use     int;
begin
  select * into v_sub
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;
  if v_sub.status in ('expired', 'revoked') then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_NOT_ASSIGNABLE';
  end if;

  select * into v_credential
  from public.sub_credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'CREDENTIAL_NOT_FOUND';
  end if;
  if v_credential.product_id <> v_sub.product_id then
    raise exception using errcode = 'P0001', message = 'CREDENTIAL_PRODUCT_MISMATCH';
  end if;
  if v_credential.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'CREDENTIAL_NOT_ACTIVE';
  end if;

  -- Re-assigning the same credential is a no-op, not an error.
  if v_sub.credential_id = v_credential.id then
    return v_sub;
  end if;

  select count(*) into v_in_use
  from public.subscriptions
  where credential_id = v_credential.id and status = 'active';

  if v_in_use >= v_credential.max_users then
    raise exception using errcode = 'P0001', message = 'CREDENTIAL_FULL';
  end if;

  v_old_cred := v_sub.credential_id;

  update public.subscriptions
     set credential_id = v_credential.id,
         team_id       = v_credential.team_id,
         status        = case when status = 'pending_credential' then 'active' else status end
   where id = v_sub.id
  returning * into v_sub;

  if v_old_cred is not null then
    insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
    values (v_sub.id, v_old_cred, p_admin_id, 'CREDENTIAL_UNASSIGNED',
            jsonb_build_object('replaced_by', v_credential.id));
  end if;

  insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
  values (v_sub.id, v_credential.id, p_admin_id, 'CREDENTIAL_ASSIGNED',
          jsonb_build_object('auto', false, 'team_id', v_credential.team_id,
                             'previous_credential_id', v_old_cred));

  return v_sub;
end $$;

-- ------------------------------------------------------------
-- sub_transfer_team
--
-- Move a subscription to another team, picking a credential that
-- belongs to that team. The customer's dashboard shows the new team
-- and the new login on their next reveal — nothing is cached.
-- ------------------------------------------------------------
create or replace function public.sub_transfer_team(
  p_subscription_id uuid,
  p_team_id         uuid,
  p_admin_id        uuid default null
)
returns public.subscriptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_sub     public.subscriptions;
  v_team    public.sub_teams;
  v_old_team uuid;
  v_cred_id uuid;
  v_members int;
begin
  select * into v_sub
  from public.subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  select * into v_team
  from public.sub_teams
  where id = p_team_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TEAM_NOT_FOUND';
  end if;
  if v_team.product_id <> v_sub.product_id then
    raise exception using errcode = 'P0001', message = 'TEAM_PRODUCT_MISMATCH';
  end if;
  if not v_team.is_active then
    raise exception using errcode = 'P0001', message = 'TEAM_INACTIVE';
  end if;

  select count(*) into v_members
  from public.subscriptions
  where team_id = v_team.id and status = 'active' and id <> v_sub.id;

  if v_members >= v_team.capacity then
    raise exception using errcode = 'P0001', message = 'TEAM_FULL';
  end if;

  -- A credential inside the destination team that still has room.
  select c.id into v_cred_id
  from public.sub_credentials c
  left join public.subscriptions s
    on s.credential_id = c.id and s.status = 'active' and s.id <> v_sub.id
  where c.team_id = v_team.id and c.status = 'active'
  group by c.id, c.max_users
  having count(s.id) < c.max_users
  order by count(s.id) desc, c.created_at asc
  limit 1;

  v_old_team := v_sub.team_id;

  update public.subscriptions
     set team_id       = v_team.id,
         credential_id = coalesce(v_cred_id, credential_id),
         status        = case
                           when status = 'pending_credential' and v_cred_id is not null
                             then 'active'
                           else status
                         end
   where id = v_sub.id
  returning * into v_sub;

  insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
  values (v_sub.id, v_sub.credential_id, p_admin_id, 'TEAM_TRANSFERRED',
          jsonb_build_object('from_team_id', v_old_team, 'to_team_id', v_team.id,
                             'credential_rebound', v_cred_id is not null));

  return v_sub;
end $$;

-- ------------------------------------------------------------
-- sub_rotate_credential
--
-- Record a password change. The APPLICATION encrypts the new
-- password and passes the ciphertext in — this function never
-- sees plaintext. Every affected customer gets an audit row so
-- we can email them "your login changed".
--
-- Returns the subscription ids that were affected.
-- ------------------------------------------------------------
create or replace function public.sub_rotate_credential(
  p_credential_id  uuid,
  p_password_enc   text,
  p_login_email    text default null,
  p_admin_id       uuid default null
)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cred public.sub_credentials;
  v_sub  record;
begin
  select * into v_cred
  from public.sub_credentials
  where id = p_credential_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'CREDENTIAL_NOT_FOUND';
  end if;

  update public.sub_credentials
     set password_enc = p_password_enc,
         login_email  = coalesce(p_login_email, login_email),
         rotated_at   = now()
   where id = v_cred.id;

  for v_sub in
    select id from public.subscriptions
    where credential_id = v_cred.id and status = 'active'
  loop
    insert into public.sub_events (subscription_id, credential_id, actor_id, event, meta)
    values (v_sub.id, v_cred.id, p_admin_id, 'CREDENTIAL_ROTATED',
            jsonb_build_object('email_changed', p_login_email is not null
                                                and p_login_email <> v_cred.login_email));
    return next v_sub.id;
  end loop;

  return;
end $$;

-- ------------------------------------------------------------
-- expire_due_subscriptions
--
-- Called daily by /api/cron/expire-subscriptions. Flips everything
-- past its expiry date and writes an EXPIRED event per row.
--
-- This is housekeeping, not the security boundary — the reveal
-- route re-checks expiry_date on every single request, so a missed
-- cron run never leaks a credential.
--
-- Returns the number of subscriptions expired.
-- ------------------------------------------------------------
create or replace function public.expire_due_subscriptions()
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  with done as (
    update public.subscriptions
       set status = 'expired'
     where status = 'active'
       and expiry_date <= now()
    returning id, credential_id, expiry_date
  ),
  logged as (
    insert into public.sub_events (subscription_id, credential_id, event, meta)
    select id, credential_id, 'EXPIRED',
           jsonb_build_object('auto', true, 'expiry_date', expiry_date)
    from done
    returning 1
  )
  select count(*) into v_count from logged;

  return v_count;
end $$;

-- ------------------------------------------------------------
-- sub_expiring_soon
--
-- Powers the admin "expiring today / in 3 days / in 7 days"
-- widgets and the reminder emails.
-- ------------------------------------------------------------
create or replace function public.sub_expiring_soon(p_days int default 7)
returns table (
  subscription_id uuid,
  user_id         uuid,
  user_email      text,
  product_name    text,
  plan_name       text,
  team_name       text,
  expiry_date     timestamptz,
  days_left       int
)
language sql
security invoker
stable
set search_path = ''
as $$
  select
    s.id,
    s.user_id,
    pr.email,
    p.name,
    pl.name,
    t.name,
    s.expiry_date,
    greatest(0, ceil(extract(epoch from (s.expiry_date - now())) / 86400)::int)
  from public.subscriptions s
  join public.profiles      pr on pr.id = s.user_id
  join public.sub_products  p  on p.id  = s.product_id
  join public.sub_plans     pl on pl.id = s.plan_id
  left join public.sub_teams t on t.id  = s.team_id
  where s.status = 'active'
    and s.expiry_date <= now() + make_interval(days => p_days)
  order by s.expiry_date asc
$$;

-- ============================================================
-- Grants — service_role only. Nothing here may be called from
-- the browser with the anon key.
-- ============================================================

revoke execute on function public.sub_pick_credential(uuid)
  from public, anon, authenticated;
revoke execute on function public.approve_sub_order(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
revoke execute on function public.sub_assign_credential(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.sub_transfer_team(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.sub_rotate_credential(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.expire_due_subscriptions()
  from public, anon, authenticated;
revoke execute on function public.sub_expiring_soon(int)
  from public, anon, authenticated;

grant execute on function public.sub_pick_credential(uuid)                     to service_role;
grant execute on function public.approve_sub_order(uuid, uuid, uuid, boolean)  to service_role;
grant execute on function public.sub_assign_credential(uuid, uuid, uuid)       to service_role;
grant execute on function public.sub_transfer_team(uuid, uuid, uuid)           to service_role;
grant execute on function public.sub_rotate_credential(uuid, text, text, uuid) to service_role;
grant execute on function public.expire_due_subscriptions()                    to service_role;
grant execute on function public.sub_expiring_soon(int)                        to service_role;

-- ============================================================
-- FILE 4 of 5: 20261002100003_seed_catalogue.sql
-- ============================================================
-- ============================================================
-- Subdealer — starting catalogue
--
-- Prices in BDT, set against official list prices in October 2026
-- (1 USD = 123.3 BDT, 1 INR = 1.279 BDT):
--
--   Canva Pro     $18.00/mo  official ~BDT 2,196/mo
--   CapCut Pro    $19.99/mo  official ~BDT 2,439/mo
--   ChatGPT Plus  $20.00/mo  official ~BDT 2,440/mo
--
-- compare_at_bdt holds that official figure, so the discount badge on the
-- site is computed from a real number rather than an invented "was" price.
--
-- Canva is priced against the local market, not against cost: an invite
-- costs nothing to supply, local sellers go as low as BDT 49/year, and
-- competing down there attracts the most support-hungry, least loyal
-- customers. BDT 399 sits above the throwaway tier and below the
-- BDT 599-850 mid tier.
--
-- INSERT ... WHERE NOT EXISTS / ON CONFLICT DO NOTHING on purpose: re-running
-- this never overwrites a price you have since edited in the admin panel.
--
-- Credentials are NOT seeded — passwords have to be encrypted by the
-- application, so add those under /admin/credentials.
-- ============================================================

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'canva-pro',
    'Canva Pro',
    'Premium Canva on your own account — we send the invite, your files stay yours.',
    E'Canva premium unlocks the paid library: millions of stock photos, videos and graphics, the premium template collection, Background Remover, Magic Resize, Brand Kit and 1TB of storage.\n\nThis is delivered as a team invite, not a shared login. You give us the email address of your own Canva account, we send an invite to it, and you accept from your inbox. You keep your own account, your own password and all your designs — the premium features simply switch on.\n\nBecause it is your account, nobody else can see your work and you never share a password with anyone.',
    'design',
    'shared',
    'invite',
    'https://www.canva.com/login',
    '["Premium stock photos, videos & audio","Premium template library","Background Remover & Magic Eraser","Magic Resize for every social size","Brand Kit — your fonts, colours & logos","1TB cloud storage","Your own account — your designs stay private","No shared password"]'::jsonb,
    E'How it works: after payment, give us the email you use for Canva. We send a team invite to it — accept it from your inbox and premium turns on. Check your spam folder if you do not see it.\n\nPlease stay in the team. Leaving it, or being removed, ends your premium access. Do not change the team settings or remove other members.\n\nIf the team is ever closed down, we move you to another one and send a fresh invite — your designs are in your own account and are never affected.',
    10,
    true
  ),
  (
    'capcut-pro',
    'CapCut Pro',
    'The full CapCut toolkit — no watermark, 4K export, every effect unlocked.',
    E'CapCut Pro removes the watermark and the export limits, and unlocks the part of the library that actually saves time: premium effects and transitions, the full sound and sticker packs, and the AI tools.\n\nAuto Captions, Background Remover, Retouch, Relight and Upscale all come included, plus 4K 60fps export and 100GB of cloud space. Works on desktop and mobile with the same login.\n\nDelivered as a ready-to-use Pro account login.',
    'video',
    'shared',
    'credential',
    'https://www.capcut.com/login',
    '["No watermark on any export","4K 60fps export, no length limit","Full premium effects & transitions library","Auto Captions in 30+ languages","AI Background Remover & Retouch","AI Upscale and Relight","Premium sound, sticker & text packs","100GB cloud storage","Works on desktop, mobile and web"]'::jsonb,
    E'This is a shared account. Please do not change the password, the email, or any account setting — it locks out everyone else on the account and ends your access.\n\nSign out on devices you are not using. Too many simultaneous sessions can get the account flagged.',
    20,
    true
  ),
  (
    'chatgpt-plus',
    'ChatGPT Plus',
    'Frontier model access, faster replies and the full tool set — at local pricing.',
    E'ChatGPT Plus gives you the frontier models instead of the free tier''s limits: far higher message caps, priority access when the service is busy, and first access to new features.\n\nIncludes file and image uploads, Advanced Data Analysis, image generation, web browsing, Voice Mode, and custom GPTs.\n\nDelivered as a ready-to-use Plus account login. No international card needed.',
    'ai',
    'shared',
    'credential',
    'https://chatgpt.com/auth/login',
    '["Access to the latest GPT models","Much higher message limits than Free","Priority access during peak hours","File & image uploads","Advanced Data Analysis","Image generation","Web browsing & Deep Research","Advanced Voice Mode","Custom GPTs"]'::jsonb,
    E'This is a shared account. Please do not change the password, the email, or enable two-factor authentication — any of those lock out everyone on the account, including you.\n\nOpenAI signs out older sessions when too many people are active at once. If you get signed out, wait a few minutes and log back in with the same details.\n\nDo not use it for anything that breaches OpenAI''s usage policies — that gets the whole account banned, not just one user.',
    30,
    true
  )
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Plans
-- ------------------------------------------------------------

-- Canva Pro — official BDT 2,196/month. Priced to the local market.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    99::numeric,  2196::numeric, 10),
    ('3 Months',   90,   179::numeric,  6588::numeric, 20),
    ('6 Months',  180,   279::numeric, 13176::numeric, 30),
    ('12 Months', 365,   399::numeric, 26352::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- CapCut Pro — official BDT 2,439/month.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   399::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1099::numeric,  7317::numeric, 20),
    ('6 Months',  180,  2099::numeric, 14634::numeric, 30),
    ('12 Months', 365,  3999::numeric, 29268::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- ChatGPT Plus — official BDT 2,440/month.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   999::numeric,  2440::numeric, 10),
    ('3 Months',   90,  2799::numeric,  7320::numeric, 20),
    ('6 Months',  180,  5299::numeric, 14640::numeric, 30),
    ('12 Months', 365,  9999::numeric, 29280::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'chatgpt-plus'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- ------------------------------------------------------------
-- Starter teams
--
-- Capacity is deliberately far below what each panel technically allows.
-- A Canva panel holds hundreds, but putting every customer on one means a
-- single shutdown takes out all of them. 50 keeps the blast radius small
-- and spare panels cost almost nothing.
-- ------------------------------------------------------------
insert into public.sub_teams (product_id, name, capacity, login_url, notes, is_active)
select p.id, v.name, v.capacity, v.login_url, v.notes, true
from public.sub_products p
cross join (values
    ('canva-pro',    'Canva Team #01',   50, 'https://www.canva.com/login',
     'Invite-based. Keep each panel at 50 members so one shutdown affects 50 customers, not all of them. Always keep two spare panels bought and idle.'),
    ('capcut-pro',   'CapCut Team #01',   8, 'https://www.capcut.com/login',
     'Accounts bought per customer last 28-30 days. At 8 members a BDT 22,000/year account is ~BDT 229/member/month. Watch for simultaneous-session limits.'),
    ('chatgpt-plus', 'ChatGPT Team #01',  4, 'https://chatgpt.com/auth/login',
     'About BDT 2,440/month per account. At 4 members that is ~BDT 610/member/month. Do not go much above 4 — OpenAI signs out concurrent sessions.')
  ) as v(slug, name, capacity, login_url, notes)
where p.slug = v.slug
  and not exists (
    select 1 from public.sub_teams st
    where st.product_id = p.id and lower(st.name) = lower(v.name)
  );

-- ============================================================
-- FILE 5 of 5: 20261002100004_storage.sql
-- ============================================================
-- ============================================================
-- Receipts bucket
--
-- Customers upload a bKash screenshot at checkout. The bucket is PRIVATE:
-- a public bucket would let anyone who guesses a filename read every
-- customer's payment screenshot.
--
-- Admins never read it directly either — /api/admin/receipt mints a
-- 120-second signed URL with the service role and redirects to that.
--
-- Idempotent: safe to re-run.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,                                     -- 10MB, matching the UI limit
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each customer gets their own folder, named after their user id. The first
-- path segment is compared against auth.uid(), so nobody can write into — or
-- read out of — somebody else's folder.

drop policy if exists "receipts upload own folder" on storage.objects;
create policy "receipts upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts read own folder" on storage.objects;
create policy "receipts read own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- No update or delete policy on purpose. A receipt is evidence for an order
-- that has already been submitted, so it must not be swapped or removed after
-- the fact. The service role can still clean up if it ever needs to.

-- Tell PostgREST about the new tables straight away, otherwise the app
-- reports "Could not find the table ... in the schema cache".
notify pgrst, 'reload schema';

commit;
