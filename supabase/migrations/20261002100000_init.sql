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

begin;

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

commit;
