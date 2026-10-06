-- ============================================================
-- Subdealer - User Dashboard, Wallet System & Encrypted License Keys
--
-- Run this script in the Supabase SQL Editor.
-- Safe to run more than once (Idempotent).
-- ============================================================

begin;

-- ============================================================
-- 1. Profiles Table Extensions & Backfill
-- ============================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text;

-- Backfill existing display names if null
update public.profiles
   set display_name = coalesce(nullif(display_name, ''), nullif(full_name, ''), split_part(email, '@', 1))
 where display_name is null or display_name = '';

-- Add FazerCards automated supplier mapping columns to sub_plans
alter table public.sub_plans
  add column if not exists fazercards_category_id text,
  add column if not exists fazercards_offer_id text,
  add column if not exists fazercards_type text default 'topups';

-- ============================================================
-- 2. User Wallets (Isolated Balance Table)
-- ============================================================

create table if not exists public.user_wallets (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  balance_bdt numeric(12,2) not null default 0.00 check (balance_bdt >= 0),
  updated_at  timestamptz not null default now()
);

-- RLS: Read self/admin, Block Client Writes
alter table public.user_wallets enable row level security;

drop policy if exists "user_wallets self select" on public.user_wallets;
create policy "user_wallets self select" on public.user_wallets
  for select using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.user_wallets from anon, authenticated;

-- Backfill wallets for existing profiles
insert into public.user_wallets (user_id, balance_bdt)
select id, 0.00 from public.profiles
on conflict (user_id) do nothing;

-- Auto-create wallet row on profile creation
create or replace function public.handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_wallets (user_id, balance_bdt)
  values (new.id, 0.00)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_profile_created_wallet on public.profiles;
create trigger on_profile_created_wallet
  after insert on public.profiles
  for each row execute function public.handle_new_user_wallet();

-- ============================================================
-- 3. Wallet Transactions Ledger
-- ============================================================

create table if not exists public.wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  amount_bdt    numeric(12,2) not null check (amount_bdt > 0),
  type          text not null check (type in ('topup', 'purchase', 'refund', 'admin_adjustment')),
  balance_after numeric(12,2) not null check (balance_after >= 0),
  method        text not null check (method in ('bkash', 'nagad', 'rocket', 'bank', 'wallet', 'admin')),
  sender_number text,
  txn_ref       text,
  order_id      uuid references public.sub_orders(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note          text,
  reject_reason text,
  reviewed_by   uuid references public.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

drop policy if exists "wallet_transactions self select" on public.wallet_transactions;
create policy "wallet_transactions self select" on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.wallet_transactions from anon, authenticated;

-- Constraints & Partial Indexes
create unique index if not exists wallet_txns_unique_ref
  on public.wallet_transactions (method, lower(txn_ref))
  where txn_ref is not null and status in ('pending', 'approved');

create unique index if not exists wallet_txns_unique_purchase
  on public.wallet_transactions (order_id)
  where type = 'purchase' and order_id is not null;

create unique index if not exists wallet_txns_unique_refund
  on public.wallet_transactions (order_id)
  where type = 'refund' and order_id is not null;

create index if not exists wallet_txns_user_idx
  on public.wallet_transactions(user_id, created_at desc);

-- ============================================================
-- 4. Encrypted License Keys Vault
-- ============================================================

create table if not exists public.license_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  order_id        uuid references public.sub_orders(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  product_id      uuid not null references public.sub_products(id) on delete cascade,
  license_key_enc text not null,
  key_hash        text unique,
  key_version     int not null default 1,
  status          text not null default 'available' check (status in ('available', 'assigned', 'revoked', 'expired')),
  assigned_at     timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.license_keys enable row level security;

-- Revoke all direct client access (Service role only access via reveal API)
revoke all on public.license_keys from anon, authenticated;

create index if not exists license_keys_user_idx
  on public.license_keys(user_id) where status = 'assigned';
create index if not exists license_keys_product_avail_idx
  on public.license_keys(product_id) where status = 'available';

-- ============================================================
-- 5. Atomic Security Functions (SERVICE ROLE ONLY)
-- ============================================================

-- Submit Wallet Top-up with Advisory Lock & Max 3 Pending Check
create or replace function public.submit_wallet_topup(
  p_user_id       uuid,
  p_amount_bdt    numeric(12,2),
  p_method        text,
  p_sender_number text,
  p_txn_ref       text
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending_count int;
  v_txn           public.wallet_transactions;
  v_clean_ref     text := upper(trim(p_txn_ref));
begin
  -- Advisory Lock per user to eliminate race conditions
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select count(*) into v_pending_count
  from public.wallet_transactions
  where user_id = p_user_id and type = 'topup' and status = 'pending';

  if v_pending_count >= 3 then
    raise exception using errcode = 'P0001', message = 'MAX_PENDING_TOPUPS_EXCEEDED';
  end if;

  insert into public.wallet_transactions (
    user_id, amount_bdt, type, balance_after, method,
    sender_number, txn_ref, status
  ) values (
    p_user_id, p_amount_bdt, 'topup', 0.00, p_method,
    trim(p_sender_number), v_clean_ref, 'pending'
  )
  returning * into v_txn;

  return v_txn;
end $$;

-- Approve Wallet Top-up
create or replace function public.approve_wallet_topup(
  p_transaction_id uuid,
  p_admin_id       uuid
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn      public.wallet_transactions;
  v_wallet   public.user_wallets;
  v_new_bal  numeric(12,2);
  v_now      timestamptz := now();
begin
  select * into v_txn
  from public.wallet_transactions
  where id = p_transaction_id and type = 'topup'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TRANSACTION_NOT_FOUND';
  end if;

  if v_txn.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'TRANSACTION_NOT_PENDING';
  end if;

  select * into v_wallet
  from public.user_wallets
  where user_id = v_txn.user_id
  for update;

  if not found then
    insert into public.user_wallets (user_id, balance_bdt)
    values (v_txn.user_id, 0.00)
    returning * into v_wallet;
  end if;

  v_new_bal := v_wallet.balance_bdt + v_txn.amount_bdt;

  update public.user_wallets
     set balance_bdt = v_new_bal,
         updated_at  = v_now
   where user_id = v_txn.user_id;

  update public.wallet_transactions
     set status        = 'approved',
         balance_after = v_new_bal,
         reviewed_by   = p_admin_id,
         reviewed_at   = v_now
   where id = v_txn.id
  returning * into v_txn;

  return v_txn;
end $$;

-- Reject Wallet Top-up
create or replace function public.reject_wallet_topup(
  p_transaction_id uuid,
  p_admin_id       uuid,
  p_reason         text
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_txn public.wallet_transactions;
  v_now timestamptz := now();
begin
  select * into v_txn
  from public.wallet_transactions
  where id = p_transaction_id and type = 'topup'
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TRANSACTION_NOT_FOUND';
  end if;

  if v_txn.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'TRANSACTION_NOT_PENDING';
  end if;

  update public.wallet_transactions
     set status        = 'rejected',
         reject_reason = p_reason,
         reviewed_by   = p_admin_id,
         reviewed_at   = v_now
   where id = v_txn.id
  returning * into v_txn;

  return v_txn;
end $$;

-- Pay Subscription Order with Wallet Balance
create or replace function public.pay_order_with_wallet(
  p_order_id uuid,
  p_user_id  uuid
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    public.sub_orders;
  v_wallet   public.user_wallets;
  v_sub      public.subscriptions;
  v_new_bal  numeric(12,2);
  v_now      timestamptz := now();
begin
  select * into v_order
  from public.sub_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.user_id <> p_user_id then
    raise exception using errcode = 'P0001', message = 'ORDER_OWNERSHIP_MISMATCH';
  end if;

  if v_order.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_PENDING';
  end if;

  select * into v_wallet
  from public.user_wallets
  where user_id = p_user_id
  for update;

  if not found or v_wallet.balance_bdt < v_order.amount_bdt then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_WALLET_BALANCE';
  end if;

  v_new_bal := v_wallet.balance_bdt - v_order.amount_bdt;

  update public.user_wallets
     set balance_bdt = v_new_bal,
         updated_at  = v_now
   where user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id, amount_bdt, type, balance_after, method,
    order_id, status, note, reviewed_at
  ) values (
    p_user_id, v_order.amount_bdt, 'purchase', v_new_bal, 'wallet',
    v_order.id, 'approved', 'Subscription purchase via Wallet Balance', v_now
  );

  v_sub := public.approve_sub_order(v_order.id, null, null, true);

  -- Auto-assign available license key if product uses license key
  perform public.auto_assign_license_key(v_sub.id);

  return v_sub;
end $$;

-- Auto-assign license key helper
create or replace function public.auto_assign_license_key(p_subscription_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions;
  v_key public.license_keys;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if not found then return false; end if;

  select * into v_key
  from public.license_keys
  where product_id = v_sub.product_id and status = 'available'
  order by created_at asc
  limit 1
  for update;

  if found then
    update public.license_keys
       set user_id         = v_sub.user_id,
           order_id        = v_sub.order_id,
           subscription_id = v_sub.id,
           status          = 'assigned',
           assigned_at     = now()
     where id = v_key.id;
    return true;
  end if;

  return false;
end $$;

-- Refund Order to Wallet Balance
create or replace function public.refund_wallet_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_reason   text
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order    public.sub_orders;
  v_wallet   public.user_wallets;
  v_txn      public.wallet_transactions;
  v_new_bal  numeric(12,2);
  v_now      timestamptz := now();
begin
  select * into v_order
  from public.sub_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'ORDER_NOT_FOUND';
  end if;

  if v_order.method <> 'wallet' then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_PAID_WITH_WALLET';
  end if;

  if exists (
    select 1 from public.wallet_transactions
    where order_id = p_order_id and type = 'refund'
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_ALREADY_REFUNDED';
  end if;

  select * into v_wallet
  from public.user_wallets
  where user_id = v_order.user_id
  for update;

  v_new_bal := v_wallet.balance_bdt + v_order.amount_bdt;

  update public.user_wallets
     set balance_bdt = v_new_bal,
         updated_at  = v_now
   where user_id = v_order.user_id;

  update public.sub_orders
     set status        = 'rejected',
         reject_reason = p_reason,
         reviewed_by   = p_admin_id,
         reviewed_at   = v_now
   where id = p_order_id;

  update public.subscriptions
     set status         = 'revoked',
         revoked_reason = p_reason
   where order_id = p_order_id;

  update public.license_keys
     set status = 'revoked'
   where order_id = p_order_id;

  insert into public.wallet_transactions (
    user_id, amount_bdt, type, balance_after, method,
    order_id, status, note, reject_reason, reviewed_by, reviewed_at
  ) values (
    v_order.user_id, v_order.amount_bdt, 'refund', v_new_bal, 'wallet',
    v_order.id, 'approved', coalesce(p_reason, 'Wallet Order Refund'), p_reason, p_admin_id, v_now
  )
  returning * into v_txn;

  return v_txn;
end $$;

-- Admin Manual Wallet Adjustment (+ Credit / - Debit)
create or replace function public.admin_adjust_wallet(
  p_user_id  uuid,
  p_amount   numeric(12,2),
  p_note     text,
  p_admin_id uuid
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet  public.user_wallets;
  v_txn     public.wallet_transactions;
  v_new_bal numeric(12,2);
  v_now     timestamptz := now();
begin
  if p_amount = 0 then
    raise exception using errcode = 'P0001', message = 'AMOUNT_CANNOT_BE_ZERO';
  end if;

  if trim(coalesce(p_note, '')) = '' then
    raise exception using errcode = 'P0001', message = 'ADJUSTMENT_NOTE_REQUIRED';
  end if;

  select * into v_wallet
  from public.user_wallets
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.user_wallets (user_id, balance_bdt)
    values (p_user_id, 0.00)
    returning * into v_wallet;
  end if;

  v_new_bal := v_wallet.balance_bdt + p_amount;

  if v_new_bal < 0 then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_FUNDS_FOR_DEBIT';
  end if;

  update public.user_wallets
     set balance_bdt = v_new_bal,
         updated_at  = v_now
   where user_id = p_user_id;

  insert into public.wallet_transactions (
    user_id, amount_bdt, type, balance_after, method,
    status, note, reviewed_by, reviewed_at
  ) values (
    p_user_id, abs(p_amount), 'admin_adjustment', v_new_bal, 'admin',
    'approved', p_note, p_admin_id, v_now
  )
  returning * into v_txn;

  return v_txn;
end $$;

-- ============================================================
-- 6. Revoke PUBLIC/Anon/Auth Grants on Security Definer Functions
-- ============================================================

revoke execute on function public.submit_wallet_topup from public, anon, authenticated;
revoke execute on function public.approve_wallet_topup from public, anon, authenticated;
revoke execute on function public.reject_wallet_topup from public, anon, authenticated;
revoke execute on function public.pay_order_with_wallet from public, anon, authenticated;
revoke execute on function public.auto_assign_license_key from public, anon, authenticated;
revoke execute on function public.refund_wallet_order from public, anon, authenticated;
revoke execute on function public.admin_adjust_wallet from public, anon, authenticated;
revoke execute on function public.approve_sub_order from public, anon, authenticated;

grant execute on function public.submit_wallet_topup to service_role;
grant execute on function public.approve_wallet_topup to service_role;
grant execute on function public.reject_wallet_topup to service_role;
grant execute on function public.pay_order_with_wallet to service_role;
grant execute on function public.auto_assign_license_key to service_role;
grant execute on function public.refund_wallet_order to service_role;
grant execute on function public.admin_adjust_wallet to service_role;
grant execute on function public.approve_sub_order to service_role;

notify pgrst, 'reload schema';

commit;
