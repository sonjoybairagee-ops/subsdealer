-- Supabase SQL Migration: shared_subscription_accounts
-- Purpose: Store admin-assigned shared subscription email credentials for customers with Access Keys and 30-Day Expiry Tracking

CREATE TABLE IF NOT EXISTS public.shared_subscription_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_customer_email TEXT,
  service_name TEXT NOT NULL DEFAULT 'Adobe Creative Cloud',
  email_address TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  access_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure target_customer_email, access_key, and expires_at columns exist on existing table
ALTER TABLE public.shared_subscription_accounts 
  ADD COLUMN IF NOT EXISTS target_customer_email TEXT,
  ADD COLUMN IF NOT EXISTS access_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

ALTER TABLE public.shared_subscription_accounts 
  DROP CONSTRAINT IF EXISTS shared_subscription_accounts_access_key_key;
ALTER TABLE public.shared_subscription_accounts 
  ADD CONSTRAINT shared_subscription_accounts_access_key_key UNIQUE (access_key);

-- Indexes for high-performance query lookups
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_user_id ON public.shared_subscription_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_email_address ON public.shared_subscription_accounts(email_address);
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_access_key ON public.shared_subscription_accounts(access_key);
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_expires_at ON public.shared_subscription_accounts(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shared_subscription_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Service role full access on shared_subscription_accounts" ON public.shared_subscription_accounts;
CREATE POLICY "Service role full access on shared_subscription_accounts"
  ON public.shared_subscription_accounts
  FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Users can view their own assigned accounts" ON public.shared_subscription_accounts;
CREATE POLICY "Users can view their own assigned accounts"
  ON public.shared_subscription_accounts
  FOR SELECT
  USING (auth.uid() = user_id OR target_customer_email = auth.jwt()->>'email');
