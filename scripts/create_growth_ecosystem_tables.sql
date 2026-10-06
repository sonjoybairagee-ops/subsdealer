-- =====================================================================
-- Subsdealer Growth Ecosystem Migration Script (Updated Schema Alignment)
-- =====================================================================

-- ---------- 1. PROFILES: referral columns & triggers ----------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_no_self_referral;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_no_self_referral CHECK (referred_by IS NULL OR referred_by <> id);

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- Short code generator without confusing characters (0/O, 1/I)
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END $$;

-- Auto-assign on new profile insert
CREATE OR REPLACE FUNCTION set_referral_code() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_referral_code ON profiles;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_referral_code();

-- Backfill existing users who do not have a referral code
UPDATE profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Prevent users from modifying referral_code or changing referred_by after setup
CREATE OR REPLACE FUNCTION protect_referral_fields() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
      RAISE EXCEPTION 'referral_code is read-only';
    END IF;
    IF OLD.referred_by IS NOT NULL AND NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
      RAISE EXCEPTION 'referred_by cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_referral_fields ON profiles;
CREATE TRIGGER trg_protect_referral_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_referral_fields();

-- ---------- 2. COST PRICE SNAPSHOT COLUMNS ----------
ALTER TABLE sub_products
  ADD COLUMN IF NOT EXISTS cost_price_bdt NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS cost_price_bdt NUMERIC(12,2) DEFAULT 0;

-- ---------- 3. REFERRAL COMMISSIONS ----------
CREATE TABLE IF NOT EXISTS referral_commissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id         UUID NOT NULL UNIQUE,           -- Unique constraint ensures idempotency
  order_amount     NUMERIC(12,2) NOT NULL,
  rate             NUMERIC(5,4) NOT NULL DEFAULT 0.0500,
  amount           NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_comm_referrer ON referral_commissions(referrer_id, created_at DESC);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrer reads own commissions" ON referral_commissions;
CREATE POLICY "referrer reads own commissions" ON referral_commissions
  FOR SELECT USING (referrer_id = auth.uid());

-- ---------- 4. WHATSAPP LOGS ----------
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone        TEXT NOT NULL,                       -- E.164 format e.g. +8801XXXXXXXXX
  event_type   TEXT NOT NULL,                       -- 'order_approved' | 'fund_approved'
  reference_id UUID,                                -- order_id or top-up id
  payload      JSONB,
  status       TEXT NOT NULL DEFAULT 'pending',     -- pending | sent | failed
  attempts     INT NOT NULL DEFAULT 0,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_status ON whatsapp_logs(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_logs_event_ref
  ON whatsapp_logs(event_type, reference_id) WHERE reference_id IS NOT NULL;

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- ---------- 5. ATOMIC RPC: CREDIT REFERRAL COMMISSION ----------
CREATE OR REPLACE FUNCTION credit_referral_commission(
  p_order_id UUID,
  p_rate NUMERIC DEFAULT 0.05
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order sub_orders%ROWTYPE;
  v_referrer UUID;
  v_commission NUMERIC(12,2);
  v_inserted UUID;
BEGIN
  SELECT * INTO v_order FROM sub_orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.status <> 'approved' THEN
    RETURN 0;
  END IF;

  SELECT referred_by INTO v_referrer FROM profiles WHERE id = v_order.user_id;
  IF v_referrer IS NULL OR v_referrer = v_order.user_id THEN
    RETURN 0;
  END IF;

  -- Anti-abuse: First approved order only
  IF EXISTS (
    SELECT 1 FROM sub_orders
    WHERE user_id = v_order.user_id AND status = 'approved' AND id <> p_order_id
      AND created_at < v_order.created_at
  ) THEN
    RETURN 0;
  END IF;

  v_commission := round(v_order.amount_bdt * p_rate, 2);
  IF v_commission <= 0 THEN RETURN 0; END IF;

  INSERT INTO referral_commissions
    (referrer_id, referred_user_id, order_id, order_amount, rate, amount)
  VALUES
    (v_referrer, v_order.user_id, p_order_id, v_order.amount_bdt, p_rate, v_commission)
  ON CONFLICT (order_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE profiles SET wallet_balance = wallet_balance + v_commission WHERE id = v_referrer;

  RETURN v_commission;
END $$;

REVOKE ALL ON FUNCTION credit_referral_commission(UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_referral_commission(UUID, NUMERIC) TO service_role;

-- ---------- 6. ATOMIC RPC: 1-CLICK RENEWAL ----------
CREATE OR REPLACE FUNCTION renew_subscription(
  p_user_id UUID,
  p_subscription_id UUID,
  p_window_days INT DEFAULT 5
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance NUMERIC;
  v_sub subscriptions%ROWTYPE;
  v_price NUMERIC;
  v_cost NUMERIC;
  v_days INT;
  v_base TIMESTAMPTZ;
  v_new_exp TIMESTAMPTZ;
  v_order_id UUID;
BEGIN
  -- Lock wallet row first to prevent concurrent double-spending
  SELECT wallet_balance INTO v_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  SELECT * INTO v_sub FROM subscriptions
   WHERE id = p_subscription_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND'; END IF;

  IF v_sub.expiry_date > now() + make_interval(days => p_window_days) THEN
    RAISE EXCEPTION 'NOT_EXPIRING_SOON';
  END IF;

  -- Fetch product price, cost snapshot, and duration
  SELECT price_bdt, COALESCE(cost_price_bdt, 0), duration_days 
    INTO v_price, v_cost, v_days 
    FROM sub_products WHERE id = v_sub.product_id;
    
  IF v_price IS NULL OR v_days IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_RENEWABLE'; END IF;

  IF v_balance < v_price THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;

  v_base := GREATEST(v_sub.expiry_date, now());
  v_new_exp := v_base + make_interval(days => v_days);

  UPDATE profiles SET wallet_balance = wallet_balance - v_price WHERE id = p_user_id;
  UPDATE subscriptions SET expiry_date = v_new_exp, status = 'active' WHERE id = p_subscription_id;

  -- Record order with cost price snapshot for financial analytics
  INSERT INTO sub_orders (user_id, product_id, amount_bdt, cost_price_bdt, method, status)
  VALUES (p_user_id, v_sub.product_id, v_price, v_cost, 'wallet', 'approved')
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'charged', v_price,
    'new_expires_at', v_new_exp,
    'new_balance', v_balance - v_price
  );
END $$;

REVOKE ALL ON FUNCTION renew_subscription(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION renew_subscription(UUID, UUID, INT) TO service_role;

-- ---------- 7. RPC: ADMIN FINANCIAL ANALYTICS ----------
CREATE OR REPLACE FUNCTION admin_analytics(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  WITH ord AS (
    SELECT * FROM sub_orders
    WHERE status = 'approved'
      AND (p_from IS NULL OR created_at >= p_from)
      AND (p_to   IS NULL OR created_at <  p_to)
  ),
  comm AS (
    SELECT COALESCE(SUM(amount), 0) AS total FROM referral_commissions
    WHERE (p_from IS NULL OR created_at >= p_from)
      AND (p_to   IS NULL OR created_at <  p_to)
  )
  SELECT jsonb_build_object(
    'gross_sales',        COALESCE((SELECT SUM(amount_bdt) FROM ord), 0),
    'product_costs',      COALESCE((SELECT SUM(cost_price_bdt) FROM ord), 0),
    'orders_count',       (SELECT COUNT(*) FROM ord),
    'referral_payouts',   (SELECT total FROM comm),
    'net_profit',         COALESCE((SELECT SUM(amount_bdt) FROM ord), 0) 
                          - COALESCE((SELECT SUM(cost_price_bdt) FROM ord), 0) 
                          - (SELECT total FROM comm),
    'active_subscribers', (SELECT COUNT(DISTINCT user_id) FROM subscriptions
                           WHERE status = 'active' AND expiry_date > now())
  );
$$;

REVOKE ALL ON FUNCTION admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_analytics(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
