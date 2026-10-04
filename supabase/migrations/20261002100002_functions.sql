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

begin;

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

commit;
